"""YOLO-based crack detection service."""
import base64
import io
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

MODEL_PATH = Path(__file__).parent.parent / "ml" / "crack_best.pt"
CLASS_NAMES = ["Crack"]

_model = None


def load_model() -> None:
    global _model
    if not MODEL_PATH.exists():
        raise RuntimeError(f"YOLO model not found: {MODEL_PATH}")
    from ultralytics import YOLO  # lazy: 워커 환경에 ultralytics 없으면 RuntimeError
    _model = YOLO(str(MODEL_PATH))


def get_model():
    if _model is None:
        load_model()
    return _model


def _confidence_to_severity(conf: float) -> str:
    if conf >= 0.85:
        return "critical"
    if conf >= 0.70:
        return "high"
    if conf >= 0.50:
        return "medium"
    return "low"


def _bbox_to_crack_width_mm(x1: float, y1: float, x2: float, y2: float, img_w: int) -> float:
    """Estimate crack width in mm using a fixed scale assumption (1px ≈ 0.1mm at typical inspection distance)."""
    pixel_width = min(x2 - x1, y2 - y1)
    return round(pixel_width * 0.1, 2)


def run_detection(image_bytes: bytes, filename: str) -> dict:
    """
    Run YOLO inference on raw image bytes.

    Returns dict with keys:
      detections: list of detection dicts
      count: int
      annotated_image_base64: str
    """
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError:
        raise ValueError(f"지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP, BMP, TIFF를 사용해주세요.")
    except Exception as e:
        raise ValueError(f"이미지를 열 수 없습니다: {e}")

    img = np.array(pil_img)[:, :, ::-1]  # RGB → BGR (OpenCV/YOLO 기대 형식)

    h, w = img.shape[:2]

    try:
        model = get_model()
    except Exception:
        _, enc = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return {"detections": [], "count": 0, "annotated_image_base64": base64.b64encode(enc.tobytes()).decode()}

    results = model(img)[0]

    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        class_name = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else str(cls_id)
        severity = _confidence_to_severity(conf)
        crack_width_mm = _bbox_to_crack_width_mm(x1, y1, x2, y2, w)

        detections.append({
            "class_name": class_name,
            "confidence": round(conf, 4),
            "bbox": json.dumps({"x": round(x1, 1), "y": round(y1, 1), "w": round(x2 - x1, 1), "h": round(y2 - y1, 1)}),
            "crack_width_mm": crack_width_mm,
            "severity": severity,
        })

    annotated = results.plot()
    _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
    img_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")

    return {
        "detections": detections,
        "count": len(detections),
        "annotated_image_base64": img_b64,
    }
