import uuid
import enum
from sqlalchemy import String, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TemplateType(str, enum.Enum):
    standard = "standard"
    summary = "summary"


class ReportFormat(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"
    both = "both"


class ReportStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("inspection_projects.id")
    )
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    template_type: Mapped[TemplateType] = mapped_column(Enum(TemplateType))
    format: Mapped[ReportFormat] = mapped_column(Enum(ReportFormat))
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus), default=ReportStatus.pending
    )
    docx_s3_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pdf_s3_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    generated_at: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    project = relationship("InspectionProject", back_populates="reports")
    created_by_user = relationship("User", back_populates="reports")
