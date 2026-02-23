from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(index=True, foreign_key="assignment.id")
    author: str = Field(default="anonymous")
    role: str = Field(default="professor")   # professor | expert | student
    content: str
    parent_id: Optional[int] = Field(default=None)   # threaded replies
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_review: bool = Field(default=False)   # formal review vs casual comment


class FeedbackCreate(SQLModel):
    author: str = "anonymous"
    role: str = "professor"
    content: str
    parent_id: Optional[int] = None
    is_review: bool = False


class FeedbackRead(SQLModel):
    id: int
    assignment_id: int
    author: str
    role: str
    content: str
    parent_id: Optional[int]
    created_at: datetime
    is_review: bool
