import base64
import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.photo import DefectDetection, DefectType, InspectionPhoto, Severity
from app.models.project import InspectionZone
from app.models.user import User
from app.schemas.photo import (
    DetectionOut,
    PhotoDetectionsOut,
    UploadUrlRequest,
    UploadUrlResponse,
)
from app.schemas.common import ok

router = APIRouter()

# Local directory for dev image storage
_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
_UPLOAD_DIR.mkdir(exist_ok=True)


def _local_image_path(photo_id: str) -> Path:
    return _UPLOAD_DIR / f"{photo_id}.jpg"


def _local_overlay_path(photo_id: str) -> Path:
    return _UPLOAD_DIR / f"{photo_id}_overlay.jpg"


def _run_yolo_analysis(photo_id: str, image_bytes: bytes, filename: str, db: Session) -> None:
    """Run YOLO inference and persist detections to DB."""
    from app.services.detection import run_detection

    photo = db.query(InspectionPhoto).filter(InspectionPhoto.id == photo_id).first()
    if not photo:
        return

    result = run_detection(image_bytes, filename)

    for det in result["detections"]:
        db.add(DefectDetection(
            photo_id=photo_id,
            defect_type=DefectType.crack,
            confidence=det["confidence"],
            bbox=det["bbox"],
            crack_width_mm=det["crack_width_mm"],
            severity=Severity(det["severity"]),
        ))

    photo.is_analyzed = True

    zone = db.query(InspectionZone).filter(InspectionZone.id == photo.zone_id).first()
    if zone:
        zone.photo_count = len(zone.photos)

    db.commit()


@router.post("/zones/{zone_id}/photos/upload-url", status_code=status.HTTP_201_CREATED)
def get_upload_url(
    zone_id: str,
    body: UploadUrlRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a photo record and return an upload URL."""
    zone = db.query(InspectionZone).filter(InspectionZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="구역을 찾을 수 없습니다.")

    photo = InspectionPhoto(
        zone_id=zone_id,
        latitude=body.latitude,
        longitude=body.longitude,
        taken_at=body.taken_at,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    if settings.S3_BUCKET_NAME:
        try:
            import boto3
            s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
            s3_key = f"photos/{zone_id}/{photo.id}/{body.filename}"
            upload_url = s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.S3_BUCKET_NAME,
                    "Key": s3_key,
                    "ContentType": body.content_type,
                },
                ExpiresIn=300,
            )
            photo.s3_key = s3_key
            photo.s3_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
            db.commit()
        except Exception:
            upload_url = f"/v1/mock-upload/{photo.id}"
    else:
        upload_url = f"/v1/mock-upload/{photo.id}"

    response = UploadUrlResponse(
        photo_id=photo.id,
        upload_url=upload_url,
        expires_in=300,
    )
    return ok(response.model_dump(), message="업로드 URL이 생성되었습니다.")


@router.put("/mock-upload/{photo_id}", status_code=status.HTTP_200_OK)
@router.post("/mock-upload/{photo_id}", status_code=status.HTTP_200_OK)
async def mock_upload(
    photo_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Dev-only: accept a raw image upload and store it locally."""
    photo = db.query(InspectionPhoto).filter(InspectionPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="사진 레코드를 찾을 수 없습니다.")

    contents = await file.read()
    dest = _local_image_path(photo_id)
    dest.write_bytes(contents)

    photo.s3_url = str(dest)
    db.commit()

    return {"message": "업로드 완료", "photo_id": photo_id, "path": str(dest)}


@router.post("/photos/{photo_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger YOLO crack detection for a photo.

    Reads the locally stored image (from mock-upload) and runs inference.
    """
    photo = db.query(InspectionPhoto).filter(InspectionPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")

    if photo.is_analyzed:
        return ok(
            {"task_id": photo_id, "status": "already_analyzed"},
            message="이미 분석된 사진입니다.",
        )

    local_path = _local_image_path(photo_id)
    if not local_path.exists():
        raise HTTPException(
            status_code=400,
            detail="이미지 파일이 존재하지 않습니다. 먼저 /v1/mock-upload/{photo_id} 로 이미지를 업로드하세요.",
        )

    image_bytes = local_path.read_bytes()
    _run_yolo_analysis(photo_id, image_bytes, local_path.name, db)

    detections = db.query(DefectDetection).filter(DefectDetection.photo_id == photo_id).all()
    return ok(
        {
            "task_id": photo_id,
            "status": "completed",
            "detection_count": len(detections),
        },
        message="균열 탐지가 완료되었습니다.",
    )


@router.post("/photos/detect", status_code=status.HTTP_200_OK)
async def detect_image(
    file: UploadFile = File(...),
    zone_id: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Direct crack detection endpoint — upload an image, get detections immediately.
    If zone_id is provided, saves the photo and detections to the DB.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    try:
        from app.services.detection import run_detection
        result = run_detection(contents, file.filename or "unknown")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"탐지 처리 중 오류가 발생했습니다: {e}")

    photo_id = None
    if zone_id:
        zone = db.query(InspectionZone).filter(InspectionZone.id == zone_id).first()
        if zone:
            photo = InspectionPhoto(
                zone_id=zone_id,
                taken_at=datetime.utcnow(),
                is_analyzed=True,
            )
            db.add(photo)
            db.flush()
            photo_id = photo.id

            dest = _local_image_path(photo_id)
            dest.write_bytes(contents)
            photo.s3_url = str(dest)

            # Save annotated overlay image
            if result.get("annotated_image_base64"):
                overlay_bytes = base64.b64decode(result["annotated_image_base64"])
                _local_overlay_path(photo_id).write_bytes(overlay_bytes)

            for det in result["detections"]:
                db.add(DefectDetection(
                    photo_id=photo_id,
                    defect_type=DefectType.crack,
                    confidence=det["confidence"],
                    bbox=det["bbox"],
                    crack_width_mm=det["crack_width_mm"],
                    severity=Severity(det["severity"]),
                ))

            zone.photo_count = (
                db.query(InspectionPhoto).filter(InspectionPhoto.zone_id == zone_id).count()
            )
            db.commit()

    result["photo_id"] = photo_id
    result["saved"] = photo_id is not None

    return ok(result, message=f"탐지 완료: {result['count']}개의 균열이 발견되었습니다.")


@router.get("/photos/{photo_id}/detections")
def get_photo_detections(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all detections for a given photo."""
    photo = db.query(InspectionPhoto).filter(InspectionPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")

    detections_out = [
        DetectionOut(
            id=d.id,
            defect_type=d.defect_type.value,
            confidence=d.confidence,
            bbox=d.bbox_dict,
            crack_width_mm=d.crack_width_mm,
            severity=d.severity.value,
        )
        for d in photo.detections
    ]

    has_overlay = _local_overlay_path(photo_id).exists()
    result = PhotoDetectionsOut(
        photo_id=photo_id,
        is_analyzed=photo.is_analyzed,
        detections=detections_out,
        overlay_url=f"/v1/photos/{photo_id}/overlay" if has_overlay else None,
    )
    return ok(result.model_dump(), message="탐지 결과를 가져왔습니다.")


@router.get("/photos/{photo_id}/image")
def serve_photo_image(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve the original uploaded photo."""
    path = _local_image_path(photo_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="이미지 파일이 없습니다.")
    return FileResponse(path, media_type="image/jpeg")


@router.get("/photos/{photo_id}/overlay")
def serve_photo_overlay(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve the annotated overlay image (with bounding boxes)."""
    from fastapi.responses import Response

    path = _local_overlay_path(photo_id)
    if path.exists():
        return FileResponse(path, media_type="image/jpeg")

    # Fall back: draw bounding boxes on-the-fly using stored detections
    raw = _local_image_path(photo_id)
    if not raw.exists():
        raise HTTPException(status_code=404, detail="이미지 파일이 없습니다.")

    try:
        import cv2
        img = cv2.imread(str(raw))
        if img is None:
            return FileResponse(raw, media_type="image/jpeg")

        photo = db.query(InspectionPhoto).filter(InspectionPhoto.id == photo_id).first()
        if photo:
            for det in photo.detections:
                bbox = det.bbox_dict
                x1, y1 = int(bbox.get("x", 0)), int(bbox.get("y", 0))
                x2, y2 = int(x1 + bbox.get("w", 0)), int(y1 + bbox.get("h", 0))
                cv2.rectangle(img, (x1, y1), (x2, y2), (0, 80, 255), 2)
                label = f"Crack {det.confidence:.0%}"
                cv2.putText(img, label, (x1, max(y1 - 6, 14)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 80, 255), 1)

        _, encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        overlay_bytes = encoded.tobytes()

        # Cache the generated overlay for future requests
        path.write_bytes(overlay_bytes)

        return Response(content=overlay_bytes, media_type="image/jpeg")
    except Exception:
        return FileResponse(raw, media_type="image/jpeg")


@router.get("/zones/{zone_id}/photos")
def list_zone_photos(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all photos for a zone with detection summaries."""
    zone = db.query(InspectionZone).filter(InspectionZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="구역을 찾을 수 없습니다.")

    photos_data = []
    for photo in sorted(zone.photos, key=lambda p: p.created_at or datetime.min, reverse=True):
        detections = photo.detections
        crack_widths = [d.crack_width_mm for d in detections if d.crack_width_mm]
        confidences = [d.confidence for d in detections]
        severities = [d.severity.value for d in detections]

        severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        max_severity = max(severities, key=lambda s: severity_order.get(s, 0)) if severities else None

        has_overlay = _local_overlay_path(photo.id).exists()
        has_image = _local_image_path(photo.id).exists()

        photos_data.append({
            "id": photo.id,
            "taken_at": photo.taken_at.isoformat() if photo.taken_at else None,
            "created_at": photo.created_at.isoformat() if photo.created_at else None,
            "is_analyzed": photo.is_analyzed,
            "detection_count": len(detections),
            "max_crack_mm": max(crack_widths) if crack_widths else None,
            "max_confidence": max(confidences) if confidences else None,
            "max_severity": max_severity,
            "image_url": f"/v1/photos/{photo.id}/image" if has_image else None,
            "overlay_url": f"/v1/photos/{photo.id}/overlay" if (has_overlay or has_image) else None,
            "detections": [
                {
                    "id": d.id,
                    "confidence": d.confidence,
                    "crack_width_mm": d.crack_width_mm,
                    "severity": d.severity.value,
                    "bbox": d.bbox_dict,
                }
                for d in detections
            ],
        })

    return ok(
        {"zone_id": zone_id, "zone_name": zone.zone_name, "photos": photos_data},
        message=f"사진 {len(photos_data)}장을 가져왔습니다.",
    )
