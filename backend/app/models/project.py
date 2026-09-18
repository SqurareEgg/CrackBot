import uuid
import enum
from sqlalchemy import String, Enum, Date, DateTime, ForeignKey, Integer, Float, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ProjectStatus(str, enum.Enum):
    planned = "planned"
    in_progress = "in_progress"
    completed = "completed"


class GradeEnum(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"


class InspectionProject(Base):
    __tablename__ = "inspection_projects"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    building_id: Mapped[str] = mapped_column(String(36), ForeignKey("buildings.id"))
    inspector_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.planned
    )
    start_date: Mapped[Date] = mapped_column(Date)
    end_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    building = relationship("Building", back_populates="projects")
    inspector = relationship("User", back_populates="projects")
    zones = relationship(
        "InspectionZone", back_populates="project", cascade="all, delete-orphan"
    )
    grades = relationship("SafetyGrade", back_populates="project")
    reports = relationship("Report", back_populates="project")


class InspectionZone(Base):
    __tablename__ = "inspection_zones"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("inspection_projects.id")
    )
    zone_name: Mapped[str] = mapped_column(String(100))
    floor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grade: Mapped[GradeEnum | None] = mapped_column(Enum(GradeEnum), nullable=True)
    photo_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    project = relationship("InspectionProject", back_populates="zones")
    photos = relationship(
        "InspectionPhoto", back_populates="zone", cascade="all, delete-orphan"
    )
    grade_records = relationship("SafetyGrade", back_populates="zone")


class SafetyGrade(Base):
    __tablename__ = "safety_grades"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("inspection_projects.id")
    )
    zone_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("inspection_zones.id"), nullable=True
    )
    grade: Mapped[GradeEnum] = mapped_column(Enum(GradeEnum))
    defect_count: Mapped[int] = mapped_column(Integer, default=0)
    max_crack_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    graded_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    project = relationship("InspectionProject", back_populates="grades")
    zone = relationship("InspectionZone", back_populates="grade_records")
