from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator


class BuildingCreate(BaseModel):
    name: str
    address: str
    latitude: float | None = None
    longitude: float | None = None
    floors: int | None = None
    built_year: int | None = None

    @field_validator("name")
    @classmethod
    def name_max_length(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError("name must be at most 200 characters")
        return v


class BuildingUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    floors: int | None = None
    built_year: int | None = None


class BuildingOut(BaseModel):
    id: str
    name: str
    address: str
    latitude: float | None
    longitude: float | None
    floors: int | None
    built_year: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
