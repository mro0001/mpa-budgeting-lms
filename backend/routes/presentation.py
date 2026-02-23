"""
Presentation config updates + version history.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Assignment, AssignmentVersion, AssignmentVersionRead, PresentationConfigUpdate
from ..services import file_service

router = APIRouter(tags=["presentation"])

DEFAULT_PRESENTATION = {
    "primary_color": "#1a56db",
    "accent_color": "#ff5a1f",
    "font_family": "Inter, sans-serif",
    "logo_url": None,
    "header_text": None,
}


@router.put("/assignments/{assignment_id}/presentation")
def update_presentation(
    assignment_id: int,
    data: PresentationConfigUpdate,
    session: Session = Depends(get_session),
):
    obj = session.get(Assignment, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Merge new values into existing config (keep fields not mentioned)
    current = dict(obj.presentation_config or DEFAULT_PRESENTATION)
    update_fields = data.model_dump(exclude={"changed_by", "change_description"}, exclude_none=True)
    current.update(update_fields)
    obj.presentation_config = current
    obj.updated_at = datetime.utcnow()
    session.add(obj)

    # Create version record
    version = AssignmentVersion(
        assignment_id=assignment_id,
        change_type="presentation",
        changed_by=data.changed_by,
        description=data.change_description or "Presentation config updated",
    )
    session.add(version)
    session.commit()
    session.refresh(version)

    # Persist a JSON snapshot of the config
    snap_path = file_service.save_snapshot(assignment_id, version.id, current)
    version.file_snapshot_path = str(snap_path)
    session.add(version)
    session.commit()
    session.refresh(obj)

    return {"presentation_config": obj.presentation_config, "version_id": version.id}


@router.get(
    "/assignments/{assignment_id}/presentation/history",
    response_model=list[AssignmentVersionRead],
)
def presentation_history(
    assignment_id: int,
    session: Session = Depends(get_session),
):
    obj = session.get(Assignment, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    stmt = (
        select(AssignmentVersion)
        .where(AssignmentVersion.assignment_id == assignment_id)
        .order_by(AssignmentVersion.created_at.desc())
    )
    return session.exec(stmt).all()
