from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, ConfigDict
from app.models.project import ProjectStatus


class ZoneIn(BaseModel):
    zone_name: str
    floor: int | None = None


class ProjectCreate(BaseModel):
    building_id: str
    title: str
    start_date: date
    end_date: date | None = None
    zones: list[ZoneIn] = []


class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus


class ZoneOut(BaseModel):
    id: str
    zone_name: str
    floor: int | None
    grade: str | None
    photo_count: int

    model_config = ConfigDict(from_attributes=True)


class ProjectOut(BaseModel):
    id: str
    title: str
    status: str
    start_date: date
    end_date: date | None
    building_id: str
    inspector_id: str
    zones: list[ZoneOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GradeOut(BaseModel):
    overall_grade: str | None
    max_crack_mm: float | None
    total_defects: int
    recommendation: str | None
    zones: list[dict[str, Any]]
