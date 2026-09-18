import math
import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, status
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.report import Report, ReportStatus
from app.models.user import User
from app.schemas.report import ReportCreate, ReportOut, ReportStatusOut, ReportDownloadOut
from app.schemas.common import ok

router = APIRouter()

_REPORTS_DIR = Path(__file__).parent.parent.parent / "reports"
_REPORTS_DIR.mkdir(exist_ok=True)


def _generate_report(report_id: str, db_factory):
    """Background task: generate PDF/DOCX and update status."""
    time.sleep(1)

    db = db_factory()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return
        report.status = ReportStatus.processing
        db.commit()

        try:
            from app.services.report_generator import generate_report_files
            generate_report_files(report, db)
        except Exception as e:
            print(f"Report generation failed for {report_id}: {e}")
            report.status = ReportStatus.failed
            db.commit()
            return

        report.status = ReportStatus.completed
        report.generated_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


@router.post("", status_code=status.HTTP_202_ACCEPTED)
def create_report(
    body: ReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a report and start background generation.

    The report goes through: pending -> processing -> completed
    Generation takes ~5 seconds total.
    """
    report = Report(
        project_id=body.project_id,
        created_by=current_user.id,
        template_type=body.template_type,
        format=body.format,
        status=ReportStatus.pending,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    from app.database import SessionLocal as _SessionLocal

    background_tasks.add_task(_generate_report, report.id, _SessionLocal)

    out = ReportOut.model_validate(report).model_dump()
    out["project_title"] = report.project.title if report.project else None
    return ok(out, message="보고서 생성이 시작되었습니다.")


@router.get("/{report_id}/status")
def get_report_status(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current generation status of a report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="보고서를 찾을 수 없습니다.")

    result = ReportStatusOut(
        report_id=report.id,
        status=report.status.value,
        format=report.format.value,
        generated_at=report.generated_at,
    )
    return ok(result.model_dump(), message="보고서 상태를 가져왔습니다.")


@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    file_type: str = Query("pdf", description="파일 형식: pdf 또는 docx"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get download URL for a completed report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="보고서를 찾을 수 없습니다.")

    if report.status != ReportStatus.completed:
        raise HTTPException(
            status_code=400,
            detail=f"보고서가 아직 생성되지 않았습니다. 현재 상태: {report.status.value}",
        )

    if file_type not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="file_type은 pdf 또는 docx 이어야 합니다.")

    file_path = _REPORTS_DIR / f"{report_id}.{file_type}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"{file_type.upper()} 파일이 존재하지 않습니다.")

    download_url = f"/v1/reports/{report_id}/download-file?file_type={file_type}"
    result = ReportDownloadOut(
        download_url=download_url,
        expires_in=604800,
        file_type=file_type,
    )
    return ok(result.model_dump(), message="다운로드 URL을 가져왔습니다.")


@router.get("/{report_id}/download-file")
def download_report_file(
    report_id: str,
    file_type: str = Query("pdf"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Serve the generated report file directly."""
    if file_type not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="file_type은 pdf 또는 docx 이어야 합니다.")

    file_path = _REPORTS_DIR / f"{report_id}.{file_type}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="파일이 존재하지 않습니다.")

    media_type = "application/pdf" if file_type == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=f"crackbot_report_{report_id[:8]}.{file_type}",
    )


@router.get("")
def list_reports(
    project_id: str | None = Query(None),
    report_status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List reports for the current user with optional filters."""
    query = db.query(Report).filter(Report.created_by == current_user.id)

    if project_id:
        query = query.filter(Report.project_id == project_id)

    if report_status:
        try:
            status_enum = ReportStatus(report_status)
            query = query.filter(Report.status == status_enum)
        except ValueError:
            pass

    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 1
    reports = query.offset((page - 1) * size).limit(size).all()

    items = []
    for r in reports:
        d = ReportOut.model_validate(r).model_dump()
        d["project_title"] = r.project.title if r.project else None
        items.append(d)
    return ok(
        {"items": items, "total": total, "page": page, "size": size, "pages": pages},
        message="보고서 목록을 가져왔습니다.",
    )
