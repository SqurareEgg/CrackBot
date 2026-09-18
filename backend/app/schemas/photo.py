from datetime import datetime
from pydantic import BaseModel


class UploadUrlRequest(BaseModel):
    filename: str
    content_type: str = "image/jpeg"
    latitude: float | None = None
    longitude: float | None = None
    taken_at: datetime | None = None


class UploadUrlResponse(BaseModel):
    photo_id: str
    upload_url: str
    expires_in: int = 300


class DetectionOut(BaseModel):
    id: str
    defect_type: str
    confidence: float
    bbox: dict
    crack_width_mm: float | None
    severity: str


class PhotoDetectionsOut(BaseModel):
    photo_id: str
    is_analyzed: bool
    detections: list[DetectionOut]
    overlay_url: str | None
