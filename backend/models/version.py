from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class AssignmentVersion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    assignment_id: int = Field(index=True, foreign_key="assignment.id")
    change_type: str  # "presentation" | "substance"
    changed_by: str = Field(default="anonymous")
    description: Optional[str] = None
    file_snapshot_path: Optional[str] = None  # path to snapshot file (presentation changes)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AssignmentVersionRead(SQLModel):
    id: int
    assignment_id: int
    change_type: str
    changed_by: str
    description: Optional[str]
    created_at: datetime
