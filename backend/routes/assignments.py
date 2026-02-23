"""
Assignment CRUD + GitHub import + serve/download endpoints.
"""
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import aiofiles
import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse, HTMLResponse
from sqlmodel import Session, select

from ..database import get_session
from ..models import (
    Assignment,
    AssignmentCreate,
    AssignmentRead,
    AssignmentUpdate,
    GitHubImportRequest,
)
from ..services import file_service, github_service, ai_service

router = APIRouter(prefix="/assignments", tags=["assignments"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_presentation_css(config: Optional[dict]) -> str:
    if not config:
        return ""
    c = config
    rules = []
    if c.get("primary_color"):
        rules.append(f"--lms-primary: {c['primary_color']};")
    if c.get("accent_color"):
        rules.append(f"--lms-accent: {c['accent_color']};")
    if c.get("font_family"):
        rules.append(f"--lms-font: {c['font_family']};")
    if not rules:
        return ""
    css_vars = "\n    ".join(rules)
    banner = ""
    if c.get("logo_url") or c.get("header_text"):
        logo_html = (
            f'<img src="{c["logo_url"]}" style="height:40px;vertical-align:middle;margin-right:12px;">'
            if c.get("logo_url")
            else ""
        )
        text_html = c.get("header_text", "")
        banner = (
            f'<div id="lms-banner" style="background:var(--lms-primary,#1a56db);color:#fff;'
            f'padding:10px 20px;font-family:var(--lms-font,sans-serif);display:flex;align-items:center;">'
            f"{logo_html}{text_html}</div>"
        )
    return (
        f"<style>:root{{\n    {css_vars}\n}}</style>\n"
        f'<script>document.addEventListener("DOMContentLoaded",function(){{'
        f'var b=document.createElement("div");b.innerHTML=`{banner}`;'
        f'if(b.firstChild)document.body.prepend(b.firstChild);}});</script>\n'
        if banner
        else f"<style>:root{{\n    {css_vars}\n}}</style>\n"
    )


async def _run_ai_enrichment(assignment_id: int, title: str, html_snippet: str) -> None:
    """Background task: enrich assignment with AI-generated description + tags."""
    from ..database import engine
    from sqlmodel import Session

    description = await ai_service.generate_description(title, html_snippet)
    tags = await ai_service.suggest_tags(title, description or "")

    with Session(engine) as session:
        db_obj = session.get(Assignment, assignment_id)
        if db_obj:
            if description and not db_obj.description:
                db_obj.description = description
            if tags:
                db_obj.tags = tags
            db_obj.updated_at = datetime.utcnow()
            session.add(db_obj)
            session.commit()


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[AssignmentRead])
def list_assignments(
    search: Optional[str] = Query(default=None),
    subject_area: Optional[str] = Query(default=None),
    course_level: Optional[str] = Query(default=None),
    published_only: bool = Query(default=True),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
):
    stmt = select(Assignment)
    if published_only:
        stmt = stmt.where(Assignment.is_published == True)
    if subject_area:
        stmt = stmt.where(Assignment.subject_area == subject_area)
    if course_level:
        stmt = stmt.where(Assignment.course_level == course_level)
    results = session.exec(stmt.offset(skip).limit(limit)).all()

    if search:
        q = search.lower()
        results = [
            a
            for a in results
            if q in (a.title or "").lower()
            or q in (a.description or "").lower()
            or any(q in str(t).lower() for t in (a.tags or []))
        ]
    return results


@router.get("/{assignment_id}", response_model=AssignmentRead)
def get_assignment(assignment_id: int, session: Session = Depends(get_session)):
    obj = session.get(Assignment, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return obj


@router.patch("/{assignment_id}", response_model=AssignmentRead)
def update_assignment(
    assignment_id: int,
    data: AssignmentUpdate,
    session: Session = Depends(get_session),
):
    obj = session.get(Assignment, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    obj.updated_at = datetime.utcnow()
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int, session: Session = Depends(get_session)):
    obj = session.get(Assignment, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")
    file_service.delete_assignment_files(assignment_id)
    session.delete(obj)
    session.commit()
    return {"ok": True}


# ── GitHub Import ──────────────────────────────────────────────────────────────

@router.post("/import", response_model=AssignmentRead)
async def import_from_github(
    req: GitHubImportRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    try:
        owner, repo, branch = github_service.parse_github_url(req.github_url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # If branch was explicitly provided in the request body, use it;
    # otherwise use what was parsed from the URL (may be ""), which triggers
    # auto-detection of the repo's default branch.
    if req.branch and req.branch != "main":
        branch = req.branch
    # (branch="" means auto-detect in fetch_repo_files)

    try:
        files, branch = await github_service.fetch_repo_files(owner, repo, branch)
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Repository not found or is private: {req.github_url}",
            )
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API error: {status}",
        )

    if not files:
        raise HTTPException(status_code=422, detail="No files found in repository")

    entry = github_service.detect_entry_file([f["path"] for f in files])

    # Create DB record first to get an ID
    db_obj = Assignment(
        title=repo.replace("-", " ").replace("_", " ").title(),
        github_url=req.github_url,
        github_branch=branch,
        created_by=req.created_by,
        file_path=entry,
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)

    # Download and save all files
    html_snippet = ""
    for file_meta in files:
        try:
            content = await github_service.download_file(file_meta["download_url"])
            filename = Path(file_meta["path"]).name
            # Preserve sub-directory structure
            rel_path = file_meta["path"]
            dest_dir = file_service.assignment_original_dir(db_obj.id) / Path(rel_path).parent
            dest_dir.mkdir(parents=True, exist_ok=True)
            (dest_dir / Path(rel_path).name).write_bytes(content)
            if rel_path == entry and not html_snippet:
                html_snippet = content.decode("utf-8", errors="replace")[:3000]
        except Exception:
            pass  # non-fatal — continue with remaining files

    # Update file_path to the entry file name (relative to original/ dir)
    db_obj.file_path = entry
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)

    # Kick off AI enrichment in the background
    if html_snippet:
        background_tasks.add_task(
            _run_ai_enrichment, db_obj.id, db_obj.title, html_snippet
        )

    return db_obj


# ── Serve (iframe) ─────────────────────────────────────────────────────────────

@router.get("/{assignment_id}/serve", response_class=HTMLResponse)
async def serve_assignment(
    assignment_id: int,
    session: Session = Depends(get_session),
):
    obj = session.get(Assignment, assignment_id)
    if not obj or not obj.file_path:
        raise HTTPException(status_code=404, detail="Assignment not found")

    entry_path = file_service.get_entry_file(assignment_id, obj.file_path)
    if not entry_path.exists():
        raise HTTPException(status_code=404, detail="Assignment file not found on disk")

    async with aiofiles.open(entry_path, "r", encoding="utf-8", errors="replace") as f:
        html = await f.read()

    # Inject presentation CSS before </head> if present, otherwise prepend
    injection = _build_presentation_css(obj.presentation_config)
    if injection:
        if "</head>" in html:
            html = html.replace("</head>", f"{injection}</head>", 1)
        else:
            html = injection + html

    return HTMLResponse(content=html)


# ── Download (original, unmodified) ───────────────────────────────────────────

@router.get("/{assignment_id}/download")
async def download_assignment(
    assignment_id: int,
    session: Session = Depends(get_session),
):
    obj = session.get(Assignment, assignment_id)
    if not obj or not obj.file_path:
        raise HTTPException(status_code=404, detail="Assignment not found")

    entry_path = file_service.get_entry_file(assignment_id, obj.file_path)
    if not entry_path.exists():
        raise HTTPException(status_code=404, detail="Assignment file not found on disk")

    # Increment download counter
    obj.download_count += 1
    obj.updated_at = datetime.utcnow()
    session.add(obj)
    session.commit()

    safe_name = obj.title.replace(" ", "_").lower() + ".html"
    return FileResponse(
        path=str(entry_path),
        media_type="text/html",
        filename=safe_name,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )
