from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.report import TemplateType, ReportFormat


class ReportCreate(BaseModel):
    project_id: str
    template_type: TemplateType
    format: ReportFormat


class ReportOut(BaseModel):
    id: str
    project_id: str
    project_title: str | None = None
    status: str
    template_type: str
    format: str
    generated_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportStatusOut(BaseModel):
    report_id: str
    status: str
    format: str
    generated_at: datetime | None


class ReportDownloadOut(BaseModel):
    download_url: str
    expires_in: int = 604800
    file_type: str
