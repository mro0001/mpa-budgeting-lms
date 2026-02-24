from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON


class Assignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: Optional[str] = None
    subject_area: Optional[str] = Field(default=None, index=True)
    course_level: Optional[str] = None  # undergraduate | graduate
    tags: Optional[list] = Field(default=None, sa_column=Column(JSON))
    github_url: Optional[str] = None
    github_branch: str = Field(default="main")

    # Presentation config — CSS variables injected at serve time; never modifies the file
    presentation_config: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # ── Substance metadata (displayed alongside the iframe, never injected into HTML) ──
    substance_notes: Optional[str] = None
    learning_objectives: Optional[str] = None
    prerequisites: Optional[str] = None           # what students need before starting
    estimated_time: Optional[str] = None           # e.g. "90 minutes"
    difficulty_level: Optional[str] = None         # introductory | intermediate | advanced
    assessment_criteria: Optional[str] = None      # how student work is evaluated
    tools_required: Optional[str] = None           # e.g. "Excel or Google Sheets"

    # Variant lineage
    variant_of: Optional[int] = Field(default=None)

    # Conformance tracking
    standard_id: Optional[int] = Field(default=None, foreign_key="assignmentstandard.id")
    conformance_score: Optional[float] = None      # 0.0–1.0, set by AI check
    review_status: str = Field(default="unreviewed")
    # unreviewed | under_review | approved | needs_revision

    file_path: Optional[str] = None     # path to HTML entry file inside storage/
    created_by: str = Field(default="anonymous")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    download_count: int = Field(default=0)
    is_published: bool = Field(default=True)


# ── Pydantic schemas (no table=True) ──────────────────────────────────────────

class AssignmentCreate(SQLModel):
    title: str
    description: Optional[str] = None
    subject_area: Optional[str] = None
    course_level: Optional[str] = None
    tags: Optional[list] = None
    github_url: Optional[str] = None
    github_branch: str = "main"
    substance_notes: Optional[str] = None
    learning_objectives: Optional[str] = None
    prerequisites: Optional[str] = None
    estimated_time: Optional[str] = None
    difficulty_level: Optional[str] = None
    assessment_criteria: Optional[str] = None
    tools_required: Optional[str] = None
    standard_id: Optional[int] = None
    created_by: str = "anonymous"


class AssignmentUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject_area: Optional[str] = None
    course_level: Optional[str] = None
    tags: Optional[list] = None
    substance_notes: Optional[str] = None
    learning_objectives: Optional[str] = None
    prerequisites: Optional[str] = None
    estimated_time: Optional[str] = None
    difficulty_level: Optional[str] = None
    assessment_criteria: Optional[str] = None
    tools_required: Optional[str] = None
    standard_id: Optional[int] = None
    is_published: Optional[bool] = None


class AssignmentRead(SQLModel):
    id: int
    title: str
    description: Optional[str]
    subject_area: Optional[str]
    course_level: Optional[str]
    tags: Optional[list]
    github_url: Optional[str]
    presentation_config: Optional[dict]
    substance_notes: Optional[str]
    learning_objectives: Optional[str]
    prerequisites: Optional[str]
    estimated_time: Optional[str]
    difficulty_level: Optional[str]
    assessment_criteria: Optional[str]
    tools_required: Optional[str]
    variant_of: Optional[int]
    standard_id: Optional[int]
    conformance_score: Optional[float]
    review_status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    download_count: int
    is_published: bool


class GitHubImportRequest(SQLModel):
    github_url: str
    branch: str = "main"
    created_by: str = "anonymous"


class PresentationConfigUpdate(SQLModel):
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    font_family: Optional[str] = None
    logo_url: Optional[str] = None
    header_text: Optional[str] = None
    changed_by: str = "anonymous"
    change_description: Optional[str] = None
