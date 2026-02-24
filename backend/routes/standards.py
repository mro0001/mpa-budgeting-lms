"""
Assignment standards CRUD + AI conformance checking.
"""
from datetime import datetime
from typing import Optional

import aiofiles
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import SQLModel, Session, select

from ..database import get_session
from ..models import (
    Assignment,
    AssignmentStandard,
    AssignmentStandardCreate,
    AssignmentStandardRead,
    ConformanceReport,
)
from ..services import ai_service, file_service

router = APIRouter(prefix="/standards", tags=["standards"])


@router.get("", response_model=list[AssignmentStandardRead])
def list_standards(session: Session = Depends(get_session)):
    return session.exec(
        select(AssignmentStandard).where(AssignmentStandard.is_active == True)
    ).all()


@router.post("", response_model=AssignmentStandardRead)
def create_standard(
    data: AssignmentStandardCreate,
    session: Session = Depends(get_session),
):
    obj = AssignmentStandard(**data.model_dump(exclude_none=True))
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.get("/{standard_id}", response_model=AssignmentStandardRead)
def get_standard(standard_id: int, session: Session = Depends(get_session)):
    obj = session.get(AssignmentStandard, standard_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Standard not found")
    return obj


@router.put("/{standard_id}", response_model=AssignmentStandardRead)
def update_standard(
    standard_id: int,
    data: AssignmentStandardCreate,
    session: Session = Depends(get_session),
):
    obj = session.get(AssignmentStandard, standard_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Standard not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(obj, key, value)
    obj.updated_at = datetime.utcnow()
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{standard_id}")
def delete_standard(standard_id: int, session: Session = Depends(get_session)):
    obj = session.get(AssignmentStandard, standard_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Standard not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    return {"ok": True}


# ── Conformance Checking ──────────────────────────────────────────────────────

@router.post("/{standard_id}/check/{assignment_id}", response_model=ConformanceReport)
async def check_conformance(
    standard_id: int,
    assignment_id: int,
    session: Session = Depends(get_session),
):
    """
    AI-powered conformance check: analyzes an assignment's HTML against
    a standard's criteria and returns a detailed report.
    """
    standard = session.get(AssignmentStandard, standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found")

    assignment = session.get(Assignment, assignment_id)
    if not assignment or not assignment.file_path:
        raise HTTPException(status_code=404, detail="Assignment not found")

    entry_path = file_service.get_entry_file(assignment_id, assignment.file_path)
    if not entry_path.exists():
        raise HTTPException(status_code=404, detail="Assignment file not found on disk")

    async with aiofiles.open(entry_path, "r", encoding="utf-8", errors="replace") as f:
        html_content = await f.read()

    # Build the full criteria list
    all_criteria = (
        standard.required_sections
        + standard.required_elements
        + standard.technical_requirements
        + standard.pedagogical_requirements
    )

    report = await ai_service.check_conformance(
        assignment_title=assignment.title,
        html_content=html_content,
        criteria=all_criteria,
        recommended=standard.recommended_elements,
    )

    if report is None:
        raise HTTPException(status_code=503, detail="AI analysis unavailable")

    # Update the assignment's conformance tracking
    assignment.standard_id = standard_id
    assignment.conformance_score = report["overall_score"]
    assignment.updated_at = datetime.utcnow()
    session.add(assignment)
    session.commit()

    return ConformanceReport(
        assignment_id=assignment_id,
        standard_id=standard_id,
        standard_name=standard.name,
        overall_score=report["overall_score"],
        met_criteria=report["met_criteria"],
        missing_criteria=report["missing_criteria"],
        recommendations=report["recommendations"],
        ai_analysis=report.get("ai_analysis"),
    )


# ── Agent Prompt Generation ("vibe coding" feature) ───────────────────────────

class AgentPromptRequest(SQLModel):
    source_description: str
    source_html_snippet: str = ""
    reference_assignment_id: Optional[int] = None  # to pull a reference HTML pattern


class AgentPromptResponse(SQLModel):
    standard_id: int
    standard_name: str
    generated_prompt: str


@router.post("/{standard_id}/generate-prompt", response_model=AgentPromptResponse)
async def generate_agent_prompt(
    standard_id: int,
    req: AgentPromptRequest,
    session: Session = Depends(get_session),
):
    """
    The 'vibe coding agent' feature: generates a detailed, copy-pasteable
    prompt that a professor can hand to any AI coding assistant (Claude,
    Cursor, Copilot, etc.) to build a conforming assignment from their
    raw source material.
    """
    standard = session.get(AssignmentStandard, standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found")

    # Optionally load a reference assignment's HTML as a structural template
    reference_snippet = ""
    if req.reference_assignment_id:
        ref_assignment = session.get(Assignment, req.reference_assignment_id)
        if ref_assignment and ref_assignment.file_path:
            ref_path = file_service.get_entry_file(
                req.reference_assignment_id, ref_assignment.file_path
            )
            if ref_path.exists():
                async with aiofiles.open(
                    ref_path, "r", encoding="utf-8", errors="replace"
                ) as f:
                    reference_snippet = await f.read()
                # Trim to a useful excerpt
                reference_snippet = reference_snippet[:5000]

    result = await ai_service.generate_agent_prompt(
        source_description=req.source_description,
        source_html_snippet=req.source_html_snippet,
        standard_name=standard.name,
        required_sections=standard.required_sections,
        required_elements=standard.required_elements,
        recommended_elements=standard.recommended_elements,
        technical_requirements=standard.technical_requirements,
        pedagogical_requirements=standard.pedagogical_requirements,
        reference_html_snippet=reference_snippet,
    )

    if result is None:
        raise HTTPException(status_code=503, detail="AI generation unavailable")

    return AgentPromptResponse(
        standard_id=standard_id,
        standard_name=standard.name,
        generated_prompt=result,
    )
