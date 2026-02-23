"""
Threaded feedback/comments + AI theme analysis.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Assignment, Feedback, FeedbackCreate, FeedbackRead
from ..services import ai_service

router = APIRouter(tags=["feedback"])


@router.get("/assignments/{assignment_id}/feedback", response_model=list[FeedbackRead])
def list_feedback(assignment_id: int, session: Session = Depends(get_session)):
    obj = session.get(Assignment, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    stmt = select(Feedback).where(Feedback.assignment_id == assignment_id)
    return session.exec(stmt).all()


@router.post("/assignments/{assignment_id}/feedback", response_model=FeedbackRead)
def create_feedback(
    assignment_id: int,
    data: FeedbackCreate,
    session: Session = Depends(get_session),
):
    obj = session.get(Assignment, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    fb = Feedback(assignment_id=assignment_id, **data.model_dump())
    session.add(fb)
    session.commit()
    session.refresh(fb)
    return fb


@router.delete("/assignments/{assignment_id}/feedback/{feedback_id}")
def delete_feedback(
    assignment_id: int,
    feedback_id: int,
    session: Session = Depends(get_session),
):
    fb = session.get(Feedback, feedback_id)
    if not fb or fb.assignment_id != assignment_id:
        raise HTTPException(status_code=404, detail="Feedback not found")
    session.delete(fb)
    session.commit()
    return {"ok": True}


@router.get("/assignments/{assignment_id}/feedback/themes")
async def feedback_themes(
    assignment_id: int,
    session: Session = Depends(get_session),
):
    obj = session.get(Assignment, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    stmt = select(Feedback).where(Feedback.assignment_id == assignment_id)
    comments = session.exec(stmt).all()
    comment_dicts = [
        {"author": c.author, "role": c.role, "content": c.content}
        for c in comments
    ]
    summary = await ai_service.analyze_feedback_themes(obj.title, comment_dicts)
    return {
        "assignment_id": assignment_id,
        "comment_count": len(comments),
        "summary": summary or "AI analysis unavailable",
    }
