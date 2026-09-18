import uuid
import enum
import json
from sqlalchemy import String, Enum, DateTime, ForeignKey, Float, Boolean, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DefectType(str, enum.Enum):
    crack = "crack"
    spalling = "spalling"
    rebar_exposure = "rebar_exposure"
    efflorescence = "efflorescence"
    delamination = "delamination"
    void = "void"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class InspectionPhoto(Base):
    __tablename__ = "inspection_photos"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    zone_id: Mapped[str] = mapped_column(String(36), ForeignKey("inspection_zones.id"))
    s3_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    s3_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    taken_at: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)
    is_analyzed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    zone = relationship("InspectionZone", back_populates="photos")
    detections = relationship(
        "DefectDetection", back_populates="photo", cascade="all, delete-orphan"
    )


class DefectDetection(Base):
    __tablename__ = "defect_detections"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    photo_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("inspection_photos.id")
    )
    defect_type: Mapped[DefectType] = mapped_column(Enum(DefectType))
    confidence: Mapped[float] = mapped_column(Float)
    # Store bbox as JSON string for SQLite compatibility
    bbox: Mapped[str] = mapped_column(Text)
    crack_width_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    severity: Mapped[Severity] = mapped_column(Enum(Severity))
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    photo = relationship("InspectionPhoto", back_populates="detections")

    @property
    def bbox_dict(self) -> dict:
        """Parse bbox JSON string into dict."""
        if self.bbox:
            return json.loads(self.bbox)
        return {}
