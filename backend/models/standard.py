"""
Assignment Standards — defines what a "conforming" assignment looks like.

Derived from the reference implementation (excel-revenue-forecasting):
  - Sidebar navigation with progress tracking
  - Tasks with concept cards, worked examples, step-by-step instructions
  - Progressive hints (3 levels per task)
  - Dual verification: quick-check (paste values) + full-check (file upload)
  - Interactive visualizations (Chart.js or similar)
  - Discussion questions with interactive elements
  - Answer key (hidden by default)
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON


class AssignmentStandard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)  # e.g. "Interactive Excel Tutorial v1"
    description: str = ""
    version: str = Field(default="1.0")

    # Structural requirements — each is a list of criteria strings
    required_sections: list = Field(
        default_factory=lambda: [
            "hero/introduction",
            "getting-started",
            "tasks (at least 2)",
            "discussion-questions",
            "answer-key",
        ],
        sa_column=Column(JSON),
    )

    required_elements: list = Field(
        default_factory=lambda: [
            "sidebar-navigation",
            "progress-tracking",
            "downloadable-starter-file",
            "concept-explanation-per-task",
            "worked-example-per-task",
            "step-by-step-instructions",
            "progressive-hints (3 levels)",
            "verification-quick-check",
            "verification-file-upload",
        ],
        sa_column=Column(JSON),
    )

    recommended_elements: list = Field(
        default_factory=lambda: [
            "interactive-chart-or-visualization",
            "error-diagnosis-feedback",
            "responsive-mobile-layout",
            "formula-reference-cards",
            "prediction-calculators",
        ],
        sa_column=Column(JSON),
    )

    # Technical constraints
    technical_requirements: list = Field(
        default_factory=lambda: [
            "self-contained single HTML file",
            "all CSS/JS embedded or from public CDN",
            "no server-side dependencies",
            "works in iframe with sandbox",
        ],
        sa_column=Column(JSON),
    )

    # Pedagogical requirements
    pedagogical_requirements: list = Field(
        default_factory=lambda: [
            "clear learning objectives stated",
            "scaffolded difficulty progression",
            "formative assessment (verification) per task",
            "summative reflection (discussion questions)",
        ],
        sa_column=Column(JSON),
    )

    created_by: str = Field(default="system")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)


# ── Schemas ────────────────────────────────────────────────────────────────────

class AssignmentStandardCreate(SQLModel):
    name: str
    description: str = ""
    version: str = "1.0"
    required_sections: Optional[list] = None
    required_elements: Optional[list] = None
    recommended_elements: Optional[list] = None
    technical_requirements: Optional[list] = None
    pedagogical_requirements: Optional[list] = None
    created_by: str = "system"


class AssignmentStandardRead(SQLModel):
    id: int
    name: str
    description: str
    version: str
    required_sections: list
    required_elements: list
    recommended_elements: list
    technical_requirements: list
    pedagogical_requirements: list
    created_by: str
    created_at: datetime
    is_active: bool


class ConformanceReport(SQLModel):
    """Returned by the AI conformance check endpoint."""
    assignment_id: int
    standard_id: int
    standard_name: str
    overall_score: float  # 0.0 – 1.0
    met_criteria: list[str]
    missing_criteria: list[str]
    recommendations: list[str]
    ai_analysis: Optional[str] = None
