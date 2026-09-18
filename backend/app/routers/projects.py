import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.project import InspectionProject, InspectionZone, SafetyGrade, ProjectStatus, GradeEnum
from app.models.photo import InspectionPhoto, DefectDetection
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectStatusUpdate,
    ProjectOut,
    ZoneOut,
    GradeOut,
)
from app.schemas.common import ok
from app.services.grade import calculate_grade, grade_recommendation

router = APIRouter()


def _project_to_dict(project: InspectionProject) -> dict:
    """Serialize an InspectionProject to a response-safe dict."""
    out = ProjectOut.model_validate(project)
    return out.model_dump()


@router.get("")
def list_projects(
    status: str | None = Query(None, description="프로젝트 상태 필터"),
    building_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List inspection projects with optional filters and pagination."""
    query = db.query(InspectionProject)

    if status:
        try:
            status_enum = ProjectStatus(status)
            query = query.filter(InspectionProject.status == status_enum)
        except ValueError:
            pass

    if building_id:
        query = query.filter(InspectionProject.building_id == building_id)

    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 1
    projects = query.offset((page - 1) * size).limit(size).all()

    items = [_project_to_dict(p) for p in projects]
    return ok(
        {"items": items, "total": total, "page": page, "size": size, "pages": pages},
        message="프로젝트 목록을 가져왔습니다.",
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new inspection project with its zones in one transaction."""
    project = InspectionProject(
        building_id=body.building_id,
        inspector_id=current_user.id,
        title=body.title,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    db.add(project)
    db.flush()  # generate project.id before adding zones

    for zone_in in body.zones:
        zone = InspectionZone(
            project_id=project.id,
            zone_name=zone_in.zone_name,
            floor=zone_in.floor,
        )
        db.add(zone)

    db.commit()
    db.refresh(project)
    return ok(_project_to_dict(project), message="프로젝트가 생성되었습니다.")


@router.get("/{project_id}")
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single project with its zones."""
    project = (
        db.query(InspectionProject)
        .filter(InspectionProject.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return ok(_project_to_dict(project), message="프로젝트 정보를 가져왔습니다.")


@router.patch("/{project_id}/status")
def update_project_status(
    project_id: str,
    body: ProjectStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the status of an inspection project."""
    project = (
        db.query(InspectionProject)
        .filter(InspectionProject.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    project.status = body.status
    db.commit()
    db.refresh(project)
    return ok(_project_to_dict(project), message="프로젝트 상태가 업데이트되었습니다.")


@router.get("/{project_id}/grades")
def get_project_grades(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return safety grades for a project.

    If SafetyGrade records exist, return them.
    Otherwise, compute on the fly from existing DefectDetection records.
    """
    project = (
        db.query(InspectionProject)
        .filter(InspectionProject.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

    # Check for existing stored grades
    stored_grades = (
        db.query(SafetyGrade)
        .filter(SafetyGrade.project_id == project_id)
        .all()
    )

    if stored_grades:
        # Use stored grades
        overall = stored_grades[0]
        zone_summaries = [
            {
                "zone_id": g.zone_id,
                "grade": g.grade.value if g.grade else None,
                "defect_count": g.defect_count,
                "max_crack_mm": g.max_crack_mm,
                "recommendation": g.recommendation,
            }
            for g in stored_grades
            if g.zone_id is not None
        ]
        grade_out = GradeOut(
            overall_grade=overall.grade.value,
            max_crack_mm=overall.max_crack_mm,
            total_defects=overall.defect_count,
            recommendation=overall.recommendation,
            zones=zone_summaries,
        )
        return ok(grade_out.model_dump(), message="안전등급 정보를 가져왔습니다.")

    # Compute from detections
    zones = db.query(InspectionZone).filter(InspectionZone.project_id == project_id).all()

    all_crack_widths: list[float] = []
    total_defects = 0
    zone_summaries = []

    for zone in zones:
        photo_ids = [p.id for p in zone.photos]
        if not photo_ids:
            zone_summaries.append(
                {
                    "zone_id": zone.id,
                    "zone_name": zone.zone_name,
                    "grade": "A",
                    "defect_count": 0,
                    "max_crack_mm": None,
                    "recommendation": grade_recommendation("A", None),
                }
            )
            continue

        detections = (
            db.query(DefectDetection)
            .filter(DefectDetection.photo_id.in_(photo_ids))
            .all()
        )

        zone_defects = len(detections)
        zone_cracks = [
            d.crack_width_mm
            for d in detections
            if d.crack_width_mm is not None
        ]
        zone_max_crack = max(zone_cracks) if zone_cracks else None
        zone_grade = calculate_grade(zone_max_crack, zone_defects)

        all_crack_widths.extend(zone_cracks)
        total_defects += zone_defects

        zone_summaries.append(
            {
                "zone_id": zone.id,
                "zone_name": zone.zone_name,
                "grade": zone_grade,
                "defect_count": zone_defects,
                "max_crack_mm": zone_max_crack,
                "recommendation": grade_recommendation(zone_grade, zone_max_crack),
            }
        )

    overall_max_crack = max(all_crack_widths) if all_crack_widths else None
    overall_grade = calculate_grade(overall_max_crack, total_defects)
    overall_recommendation = grade_recommendation(overall_grade, overall_max_crack)

    grade_out = GradeOut(
        overall_grade=overall_grade,
        max_crack_mm=overall_max_crack,
        total_defects=total_defects,
        recommendation=overall_recommendation,
        zones=zone_summaries,
    )
    return ok(grade_out.model_dump(), message="안전등급이 계산되었습니다.")
