"""
Assignment connections — defines curriculum sequences and prerequisites.
"Connection branch placement" from the original spec.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class AssignmentConnection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    from_assignment_id: int = Field(index=True, foreign_key="assignment.id")
    to_assignment_id: int = Field(index=True, foreign_key="assignment.id")
    connection_type: str = Field(default="prerequisite")
    # prerequisite — must complete 'from' before 'to'
    # recommended — suggested next step
    # related     — thematically related
    description: Optional[str] = None
    created_by: str = Field(default="anonymous")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AssignmentConnectionCreate(SQLModel):
    from_assignment_id: int
    to_assignment_id: int
    connection_type: str = "prerequisite"
    description: Optional[str] = None
    created_by: str = "anonymous"


class AssignmentConnectionRead(SQLModel):
    id: int
    from_assignment_id: int
    to_assignment_id: int
    connection_type: str
    description: Optional[str]
    created_by: str
    created_at: datetime
