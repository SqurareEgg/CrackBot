import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.building import Building
from app.models.user import User
from app.schemas.building import BuildingCreate, BuildingUpdate, BuildingOut
from app.schemas.common import ok, err

router = APIRouter()


@router.get("")
def list_buildings(
    q: str | None = Query(None, description="건물 이름 또는 주소 검색"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List buildings with optional search and pagination."""
    query = db.query(Building)

    if q:
        search = f"%{q}%"
        query = query.filter(
            (Building.name.ilike(search)) | (Building.address.ilike(search))
        )

    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 1
    items = query.offset((page - 1) * size).limit(size).all()

    buildings_out = [BuildingOut.model_validate(b).model_dump() for b in items]
    return ok(
        {
            "items": buildings_out,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        },
        message="건물 목록을 가져왔습니다.",
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_building(
    body: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new building record."""
    building = Building(**body.model_dump())
    db.add(building)
    db.commit()
    db.refresh(building)
    return ok(BuildingOut.model_validate(building).model_dump(), message="건물이 등록되었습니다.")


@router.get("/{building_id}")
def get_building(
    building_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single building by ID."""
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="건물을 찾을 수 없습니다.")
    return ok(BuildingOut.model_validate(building).model_dump(), message="건물 정보를 가져왔습니다.")


@router.patch("/{building_id}")
def update_building(
    building_id: str,
    body: BuildingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update a building (only non-None fields are applied)."""
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="건물을 찾을 수 없습니다.")

    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(building, field, value)

    db.commit()
    db.refresh(building)
    return ok(BuildingOut.model_validate(building).model_dump(), message="건물 정보가 수정되었습니다.")
