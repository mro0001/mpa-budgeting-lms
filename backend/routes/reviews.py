"""
Structured expert reviews with workflow status tracking.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    Assignment,
    Review,
    ReviewCreate,
    ReviewRead,
    ReviewStatusUpdate,
)

router = APIRouter(tags=["reviews"])

VALID_STATUSES = {"submitted", "under_review", "approved", "needs_revision", "rejected"}
VALID_TRANSITIONS = {
    "submitted": {"under_review"},
    "under_review": {"approved", "needs_revision", "rejected"},
    "needs_revision": {"under_review", "submitted"},
    "approved": set(),
    "rejected": {"under_review"},
}


@router.get("/assignments/{assignment_id}/reviews", response_model=list[ReviewRead])
def list_reviews(assignment_id: int, session: Session = Depends(get_session)):
    if not session.get(Assignment, assignment_id):
        raise HTTPException(status_code=404, detail="Assignment not found")
    stmt = (
        select(Review)
        .where(Review.assignment_id == assignment_id)
        .order_by(Review.created_at.desc())
    )
    return session.exec(stmt).all()


@router.post("/assignments/{assignment_id}/reviews", response_model=ReviewRead)
def create_review(
    assignment_id: int,
    data: ReviewCreate,
    session: Session = Depends(get_session),
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    review = Review(assignment_id=assignment_id, **data.model_dump())
    session.add(review)

    # Update assignment review status
    assignment.review_status = "under_review"
    assignment.updated_at = datetime.utcnow()
    session.add(assignment)

    session.commit()
    session.refresh(review)
    return review


@router.patch("/reviews/{review_id}/status", response_model=ReviewRead)
def update_review_status(
    review_id: int,
    data: ReviewStatusUpdate,
    session: Session = Depends(get_session),
):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status: {data.status}")

    allowed = VALID_TRANSITIONS.get(review.status, set())
    if data.status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition from '{review.status}' to '{data.status}'",
        )

    review.status = data.status
    review.updated_at = datetime.utcnow()
    session.add(review)

    # Propagate status to assignment
    assignment = session.get(Assignment, review.assignment_id)
    if assignment:
        if data.status == "approved":
            assignment.review_status = "approved"
        elif data.status == "needs_revision":
            assignment.review_status = "needs_revision"
        elif data.status == "rejected":
            assignment.review_status = "needs_revision"
        assignment.updated_at = datetime.utcnow()
        session.add(assignment)

    session.commit()
    session.refresh(review)
    return review
