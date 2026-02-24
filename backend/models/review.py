"""
Structured expert reviews with workflow status tracking.
Distinct from casual feedback/comments — these are formal evaluations.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON


class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(index=True, foreign_key="assignment.id")
    reviewer: str
    reviewer_role: str = Field(default="expert")  # professor | expert | practitioner

    # Workflow status
    status: str = Field(default="submitted", index=True)
    # submitted → under_review → approved | needs_revision | rejected

    # Structured evaluation
    overall_rating: Optional[int] = None  # 1-5
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    suggested_changes: Optional[str] = None

    # Checklist scores (JSON: {"criterion": "met"|"partial"|"not_met"})
    criteria_scores: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # Standard used for this review (optional FK)
    standard_id: Optional[int] = Field(default=None, foreign_key="assignmentstandard.id")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ReviewCreate(SQLModel):
    reviewer: str
    reviewer_role: str = "expert"
    overall_rating: Optional[int] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    suggested_changes: Optional[str] = None
    criteria_scores: Optional[dict] = None
    standard_id: Optional[int] = None


class ReviewRead(SQLModel):
    id: int
    assignment_id: int
    reviewer: str
    reviewer_role: str
    status: str
    overall_rating: Optional[int]
    strengths: Optional[str]
    weaknesses: Optional[str]
    suggested_changes: Optional[str]
    criteria_scores: Optional[dict]
    standard_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class ReviewStatusUpdate(SQLModel):
    status: str  # under_review | approved | needs_revision | rejected
    reason: Optional[str] = None
