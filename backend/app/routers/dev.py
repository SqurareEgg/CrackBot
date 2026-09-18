"""Dev-only mock endpoints — local development without S3 or real document generation."""
import io
import xml.sax.saxutils as _su
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.photo import DefectDetection, InspectionPhoto
from app.models.report import Report

router = APIRouter()

_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"


@router.get("/debug-detect")
def debug_detect():
    import sys
    try:
        import ultralytics
        ultra_ok = ultralytics.__file__
    except Exception as e:
        ultra_ok = f"FAIL: {e}"
    try:
        import cv2
        cv2_ok = cv2.__version__
    except Exception as e:
        cv2_ok = f"FAIL: {e}"
    return {
        "executable": sys.executable,
        "ultralytics": ultra_ok,
        "cv2": cv2_ok,
        "site_packages": [p for p in sys.path if "site-packages" in p],
    }


# ── PDF generator ────────────────────────────────────────────────

def _make_pdf(lines: list[str]) -> bytes:
    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    ops = []
    for i, line in enumerate(lines[:35]):
        y = 780 - i * 22
        ops.append(f"BT /F1 11 Tf 50 {y} Td ({esc(line)}) Tj ET")
    content = "\n".join(ops).encode("latin-1", errors="replace")

    obj1 = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    obj2 = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    obj3 = (
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n"
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    )
    obj4_head = f"4 0 obj\n<< /Length {len(content)} >>\nstream\n".encode()
    obj4 = obj4_head + content + b"\nendstream\nendobj\n"
    obj5 = b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"

    header = b"%PDF-1.4\n"
    objs = [obj1, obj2, obj3, obj4, obj5]
    offsets, pos, body = [], len(header), b""
    for obj in objs:
        offsets.append(pos)
        body += obj
        pos += len(obj)

    xref_pos = len(header) + len(body)
    xref = f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n"
    for off in offsets:
        xref += f"{off:010d} 00000 n \n"
    trailer = f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF"

    return header + body + (xref + trailer).encode("latin-1")


# ── DOCX generator ───────────────────────────────────────────────

def _make_docx(lines: list[str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml"'
            ' ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            "</Types>",
        )
        zf.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1"'
            ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"'
            ' Target="word/document.xml"/>'
            "</Relationships>",
        )
        paras = "".join(
            f'<w:p><w:r><w:t xml:space="preserve">{_su.escape(line)}</w:t></w:r></w:p>'
            for line in lines
        )
        zf.writestr(
            "word/document.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f"<w:body>{paras}<w:sectPr/></w:body>"
            "</w:document>",
        )
        zf.writestr(
            "word/_rels/document.xml.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            "</Relationships>",
        )
    return buf.getvalue()


# ── Endpoints ────────────────────────────────────────────────────

@router.get("/mock-download/{filename}")
def mock_download(filename: str, db: Session = Depends(get_db)):
    """Dev-only: generate and return a placeholder PDF or DOCX for a completed report."""
    if "." not in filename:
        raise HTTPException(status_code=400, detail="파일명이 올바르지 않습니다.")

    report_id, ext = filename.rsplit(".", 1)
    ext = ext.lower()

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="보고서를 찾을 수 없습니다.")

    project_title = report.project.title if report.project else "Unknown"
    generated = (
        report.generated_at.strftime("%Y-%m-%d %H:%M")
        if report.generated_at else "N/A"
    )
    template_labels = {"standard": "National Standard Form", "summary": "Summary Report"}
    template = template_labels.get(str(report.template_type.value), "Standard")

    lines = [
        "CrackBot AI - Building Safety Inspection Report",
        "=" * 52,
        f"Project : {project_title}",
        f"Generated: {generated}",
        f"Template : {template}",
        f"Format   : {ext.upper()}",
        f"Report ID: {report_id}",
        "=" * 52,
        "",
        "[Development placeholder — real document generation coming soon]",
    ]

    if ext == "docx":
        content = _make_docx(lines)
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        content = _make_pdf(lines)
        media = "application/pdf"

    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="report_{report_id}.{ext}"'},
    )


@router.get("/mock-overlay/{photo_id}")
def mock_overlay(photo_id: str, db: Session = Depends(get_db)):
    """Dev-only: return the inspection photo with YOLO bounding boxes drawn on it."""
    photo = db.query(InspectionPhoto).filter(InspectionPhoto.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")

    local_path = _UPLOAD_DIR / f"{photo_id}.jpg"
    if not local_path.exists():
        raise HTTPException(status_code=404, detail="이미지 파일이 없습니다.")

    try:
        import cv2
    except ImportError:
        raise HTTPException(status_code=503, detail="cv2 모듈이 설치되지 않았습니다.")

    img = cv2.imread(str(local_path))
    if img is None:
        raise HTTPException(status_code=500, detail="이미지를 읽을 수 없습니다.")

    detections = (
        db.query(DefectDetection)
        .filter(DefectDetection.photo_id == photo_id)
        .all()
    )
    for det in detections:
        bbox = det.bbox_dict
        x1 = int(bbox.get("x", 0))
        y1 = int(bbox.get("y", 0))
        x2 = int(x1 + bbox.get("w", 0))
        y2 = int(y1 + bbox.get("h", 0))
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 2)
        label = f"Crack {det.confidence:.0%}"
        cv2.putText(
            img, label, (x1, max(y1 - 6, 14)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1,
        )

    _, encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return Response(content=encoded.tobytes(), media_type="image/jpeg")
