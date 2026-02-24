# CLAUDE.md — MPA Budgeting LMS

Developer guide for Claude Code and human contributors.

---

## Project Overview

An AI-enabled Learning Management System for Local Government budgeting assignments in MPA (Master of Public Administration) courses. Professors can import or upload self-contained HTML assignments, run AI conformance checks against defined standards, customize visual presentation without touching source files, conduct structured expert reviews, build curriculum sequences, and use the AI Agent to generate prompts for creating new conforming assignments.

---

## Dev Commands

### Backend (run from `lms-platform/` directory — NOT the workspace root)
```bash
uv run uvicorn backend.main:app --reload --port 8000
curl http://localhost:8000/api/health
```

### Frontend (run from `lms-platform/frontend/`)
```bash
npm run dev        # http://localhost:5173, proxies /api → :8000
npm run build      # production build to dist/
```

Both servers must be running for full functionality.

---

## Architecture

### Core Invariant: Presentation / Substance Separation
The assignment HTML file on disk is **never modified**. This rule cannot be broken:

- `GET /api/assignments/{id}/serve` injects CSS variables at response time (not written to disk)
- `GET /api/assignments/{id}/download` returns the file byte-for-byte with no modifications
- Substance metadata lives in DB columns shown *alongside* the iframe, never injected into HTML

### Assignment Model
The reference implementation (excel-revenue-forecasting) defines the pattern:
- Self-contained single HTML file with all CSS/JS embedded or from CDN
- Sidebar navigation with progress tracking
- Progressive tasks with concept cards + worked examples + verification
- Progressive hints (3 levels per task)
- Dual verification: quick-check (paste values) + full-check (upload file)
- Discussion questions with interactive calculators
- Hidden answer key

### iframe Sandbox
```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" />
```
All four flags are required:
- `allow-scripts`: assignments use Chart.js, SheetJS, custom validation
- `allow-same-origin`: needed for relative asset path resolution
- `allow-forms`: student input verification uses form elements
- `allow-downloads`: SheetJS generates downloadable .xlsx files

### AI Integration (MindRouter2 — Backend Only)
Five AI capabilities, all server-side in `backend/services/ai_service.py`:

| Capability | Trigger | Output |
|---|---|---|
| Description generation | GitHub import / file upload (background) | 2-3 sentence catalog description |
| Tag suggestion | GitHub import / file upload (background) | JSON array of 3-6 tags |
| Feedback theme analysis | `GET /api/assignments/{id}/feedback/themes` | Prose summary of feedback patterns |
| Conformance checking | `POST /api/standards/{id}/check/{assignment_id}` | Score + met/missing criteria + recommendations |
| Agent prompt generation | `POST /api/standards/{id}/generate-prompt` | Copy-pasteable prompt for AI coding assistants |

**Security rules:**
- `MINDROUTER2_URL` and `MINDROUTER2_KEY` exist only in `.env` (gitignored)
- Never prefixed `VITE_*` or exposed in any API response body
- Error responses return generic messages, never internal URLs

### GitHub Import Flow
```
parse_github_url() → get_default_branch() [auto-detect main/master]
  → fetch_repo_files() via /git/trees/{branch}?recursive=1
  → download each file → storage/{id}/original/
  → detect_entry_file() → save DB record → return immediately
  → BackgroundTask: generate_description() + suggest_tags()
```

### Assignment Standards & Conformance
Standards define structural/pedagogical/technical requirements. The AI conformance check:
1. Reads the assignment HTML from storage
2. Sends an excerpt + all criteria to MindRouter2
3. Returns `{ overall_score, met_criteria, missing_criteria, recommendations }`
4. Updates `assignment.conformance_score` in the DB

### The "Vibe Coding Agent" Feature
`POST /api/standards/{id}/generate-prompt` takes:
- Source material description (what the professor wants to teach)
- An optional source HTML snippet
- An optional reference assignment (used as a structural template)

It returns a detailed prompt that a professor can paste into Claude, Cursor, or any AI coding assistant to generate a conforming assignment HTML file from scratch.

### Structured Expert Reviews
Reviews follow a workflow: `submitted → under_review → approved | needs_revision | rejected`
- Reviews have structured fields: rating, strengths, weaknesses, suggested changes
- Review status propagates to the assignment (`assignment.review_status`)
- Dashboard shows "Needs Attention" queue for unreviewed/needs-revision assignments

### Assignment Connections
Three connection types:
- `prerequisite`: must complete A before starting B
- `recommended`: suggested next step
- `related`: thematically linked

`GET /api/learning-paths` returns the full graph (nodes + edges) for curriculum visualization.

---

## Database Schema

SQLite at `backend/lms.db` (gitignored). Six tables:

| Table | Key fields |
|---|---|
| `assignment` | id, title, tags (JSON), presentation_config (JSON), standard_id, conformance_score, review_status, difficulty_level, prerequisites, estimated_time, assessment_criteria, tools_required |
| `feedback` | id, assignment_id, content, parent_id (threading), role, is_review |
| `review` | id, assignment_id, reviewer, status (workflow), overall_rating, strengths, weaknesses, suggested_changes, criteria_scores (JSON) |
| `assignmentstandard` | id, name, required_sections (JSON), required_elements (JSON), recommended_elements (JSON), technical_requirements (JSON), pedagogical_requirements (JSON) |
| `assignmentversion` | id, assignment_id, change_type, file_snapshot_path |
| `assignmentconnection` | id, from_assignment_id, to_assignment_id, connection_type |

---

## File Storage

```
backend/storage/
  {assignment_id}/
    original/     ← immutable source files (never modified)
    snapshots/    ← v{version_id}.json presentation config snapshots
```

---

## Adding Features

### New API Route
1. Create or extend a file in `backend/routes/`
2. Define `APIRouter` with `prefix` and `tags`
3. Register in `backend/routes/__init__.py`
4. Include in `backend/main.py` with `app.include_router(router, prefix="/api")`
5. Add functions in `frontend/src/lib/api.js`

### New AI Capability
1. Add function to `backend/services/ai_service.py`
2. Guard with `if not MINDROUTER2_URL or not MINDROUTER2_KEY: return None`
3. Use `_chat()` for the API call
4. Return `None` on any exception (never leak credentials)
5. Create a route endpoint that calls the new function

---

## Common Pitfalls

- **Wrong working directory**: `uv run uvicorn backend.main:app` must run from `lms-platform/`, not the workspace root
- **Stale DB schema**: Delete `backend/lms.db` to recreate tables after model changes
- **Branch detection**: `github_service.get_default_branch()` handles repos with `main` or `master`
- **iframe sandbox**: Don't remove `allow-downloads` — breaks SheetJS export
- **Subject areas are dynamic**: The dashboard `GET /api/dashboard/subject-areas` returns subjects actually in use — no hardcoded list
- **Review workflow validation**: Status transitions are enforced server-side — `submitted` can only go to `under_review`, etc.
