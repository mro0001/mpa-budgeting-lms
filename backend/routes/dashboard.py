"""
Platform-wide statistics for the dashboard.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from ..database import get_session
from ..models import Assignment, Feedback

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(session: Session = Depends(get_session)):
    total_assignments = session.exec(
        select(func.count(Assignment.id)).where(Assignment.is_published == True)
    ).one()

    total_feedback = session.exec(select(func.count(Feedback.id))).one()

    total_downloads = session.exec(
        select(func.sum(Assignment.download_count))
    ).one() or 0

    return {
        "total_assignments": total_assignments,
        "total_feedback": total_feedback,
        "total_downloads": total_downloads,
    }


@router.get("/top-assignments")
def top_assignments(
    limit: int = 5,
    session: Session = Depends(get_session),
):
    stmt = (
        select(Assignment)
        .where(Assignment.is_published == True)
        .order_by(Assignment.download_count.desc())
        .limit(limit)
    )
    results = session.exec(stmt).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "download_count": a.download_count,
            "subject_area": a.subject_area,
        }
        for a in results
    ]


@router.get("/recent-feedback")
def recent_feedback(
    limit: int = 10,
    session: Session = Depends(get_session),
):
    stmt = (
        select(Feedback)
        .order_by(Feedback.created_at.desc())
        .limit(limit)
    )
    items = session.exec(stmt).all()
    return [
        {
            "id": f.id,
            "assignment_id": f.assignment_id,
            "author": f.author,
            "role": f.role,
            "content": f.content[:200],
            "created_at": f.created_at,
        }
        for f in items
    ]


@router.get("/tag-cloud")
def tag_cloud(session: Session = Depends(get_session)):
    assignments = session.exec(
        select(Assignment).where(Assignment.is_published == True)
    ).all()
    counts: dict[str, int] = {}
    for a in assignments:
        for tag in (a.tags or []):
            counts[str(tag)] = counts.get(str(tag), 0) + 1
    sorted_tags = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [{"tag": t, "count": c} for t, c in sorted_tags[:30]]
