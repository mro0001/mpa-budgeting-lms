"""
Platform-wide statistics and quality analytics for the dashboard.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from ..database import get_session
from ..models import Assignment, Feedback, Review, AssignmentStandard

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
    total_reviews = session.exec(select(func.count(Review.id))).one()
    total_standards = session.exec(
        select(func.count(AssignmentStandard.id)).where(AssignmentStandard.is_active == True)
    ).one()

    return {
        "total_assignments": total_assignments,
        "total_feedback": total_feedback,
        "total_downloads": total_downloads,
        "total_reviews": total_reviews,
        "total_standards": total_standards,
    }


@router.get("/quality")
def get_quality_metrics(session: Session = Depends(get_session)):
    """Operational quality metrics — review coverage, conformance, completeness."""
    assignments = session.exec(
        select(Assignment).where(Assignment.is_published == True)
    ).all()
    total = len(assignments)
    if total == 0:
        return {
            "total": 0,
            "with_description": 0,
            "with_objectives": 0,
            "with_reviews": 0,
            "review_status_breakdown": {},
            "conformance_checked": 0,
            "avg_conformance_score": None,
            "difficulty_breakdown": {},
        }

    with_desc = sum(1 for a in assignments if a.description)
    with_obj = sum(1 for a in assignments if a.learning_objectives)
    with_reviews = sum(1 for a in assignments if a.review_status != "unreviewed")
    conformance_checked = sum(1 for a in assignments if a.conformance_score is not None)
    scores = [a.conformance_score for a in assignments if a.conformance_score is not None]

    review_status_breakdown = {}
    for a in assignments:
        review_status_breakdown[a.review_status] = review_status_breakdown.get(a.review_status, 0) + 1

    difficulty_breakdown = {}
    for a in assignments:
        level = a.difficulty_level or "unspecified"
        difficulty_breakdown[level] = difficulty_breakdown.get(level, 0) + 1

    return {
        "total": total,
        "with_description": with_desc,
        "with_objectives": with_obj,
        "with_reviews": with_reviews,
        "review_status_breakdown": review_status_breakdown,
        "conformance_checked": conformance_checked,
        "avg_conformance_score": round(sum(scores) / len(scores), 2) if scores else None,
        "difficulty_breakdown": difficulty_breakdown,
    }


@router.get("/top-assignments")
def top_assignments(limit: int = 5, session: Session = Depends(get_session)):
    stmt = (
        select(Assignment)
        .where(Assignment.is_published == True)
        .order_by(Assignment.download_count.desc())
        .limit(limit)
    )
    return [
        {
            "id": a.id,
            "title": a.title,
            "download_count": a.download_count,
            "subject_area": a.subject_area,
            "review_status": a.review_status,
            "conformance_score": a.conformance_score,
        }
        for a in session.exec(stmt).all()
    ]


@router.get("/recent-feedback")
def recent_feedback(limit: int = 10, session: Session = Depends(get_session)):
    stmt = select(Feedback).order_by(Feedback.created_at.desc()).limit(limit)
    return [
        {
            "id": f.id,
            "assignment_id": f.assignment_id,
            "author": f.author,
            "role": f.role,
            "content": f.content[:200],
            "created_at": f.created_at,
        }
        for f in session.exec(stmt).all()
    ]


@router.get("/pending-reviews")
def pending_reviews(session: Session = Depends(get_session)):
    """Assignments that need review attention."""
    stmt = select(Assignment).where(
        Assignment.is_published == True,
        Assignment.review_status.in_(["unreviewed", "under_review", "needs_revision"]),
    )
    return [
        {
            "id": a.id,
            "title": a.title,
            "review_status": a.review_status,
            "created_by": a.created_by,
            "created_at": a.created_at,
        }
        for a in session.exec(stmt).all()
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


@router.get("/subject-areas")
def subject_areas(session: Session = Depends(get_session)):
    """Dynamic list of all subject areas currently in use (not hardcoded)."""
    assignments = session.exec(
        select(Assignment.subject_area)
        .where(Assignment.is_published == True, Assignment.subject_area.is_not(None))
        .distinct()
    ).all()
    return sorted(set(a for a in assignments if a))
