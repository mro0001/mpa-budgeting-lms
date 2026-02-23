# CLAUDE.md — MPA Budgeting LMS

Developer guide for Claude Code and human contributors.

---

## Project Overview

An AI-enabled Learning Management System for Local Government budgeting assignments in MPA (Master of Public Administration) courses. Professors can import self-contained HTML assignments from GitHub, customize their visual appearance, annotate them with learning objectives, and discuss them with colleagues — all without ever modifying the assignment's source HTML.

---

## Dev Commands

### Backend (run from `lms-platform/` directory)
```bash
# Start the API server with hot reload
uv run uvicorn backend.main:app --reload --port 8000

# Verify startup
curl http://localhost:8000/api/health

# Run a one-off Python command in the venv
uv run python -c "from backend.database import create_db_and_tables; create_db_and_tables()"
```

### Frontend (run from `lms-platform/frontend/` directory)
```bash
npm run dev        # dev server at http://localhost:5173
npm run build      # production build to dist/
npm run preview    # preview the production build
```

### Both servers must be running for the full app to work.
The Vite dev server proxies `/api/*` → `http://localhost:8000`.

---

## Architecture

### Presentation / Substance Separation (Core Invariant)
The assignment HTML file on disk is **never modified**. This is intentional and must be preserved:

- `GET /api/assignments/{id}/serve` — reads the original HTML, **injects** a `<style>` block with CSS custom properties, and streams it to the iframe. Nothing is written to disk.
- `GET /api/assignments/{id}/download` — returns the original file byte-for-byte with `Content-Disposition: attachment`.
- Substance metadata (`description`, `learning_objectives`, `substance_notes`) lives in the DB and is shown *alongside* the iframe in the React UI — never injected into the HTML.

### iframe Isolation
The React frontend renders assignments inside:
```html
<iframe src="/api/assignments/{id}/serve" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" />
```
This gives the assignment's own JS (Chart.js, SheetJS, etc.) a clean execution context completely isolated from React. Do not remove the `sandbox` attribute or the `allow-same-origin` flag — assignments need both for relative path resolution and file downloads.

### AI Integration (MindRouter2)
All AI calls are **backend-only** via `backend/services/ai_service.py`. The three AI features are:

| Feature | Trigger | Prompt output |
|---------|---------|---------------|
| Description generation | GitHub import (background task) | 2–3 sentence catalog description |
| Tag suggestion | GitHub import (background task) | JSON array of 3–6 tags |
| Feedback theme analysis | `GET /api/assignments/{id}/feedback/themes` | Prose summary for professor |

**Security rules (never break these):**
- `MINDROUTER2_URL` and `MINDROUTER2_KEY` must only exist in `.env` (gitignored).
- They must never be prefixed `VITE_*` or appear in `vite.config.js`.
- AI error responses must return generic messages, never internal URLs or exception details.
- No AI credentials are ever returned in any API response body.

### GitHub Import Flow
```
User submits URL → parse_github_url() → get_default_branch() [auto-detects main/master]
  → fetch_repo_files() → GET /git/trees/{branch}?recursive=1
  → download each file → save to storage/{id}/original/
  → detect entry HTML → save DB record → return immediately
  → BackgroundTask: generate_description() + suggest_tags() → update DB
```
The import endpoint returns immediately with the assignment record. AI enrichment happens in the background — the frontend will get the description/tags on the next page load or query refetch.

---

## Database

SQLite file at `backend/lms.db` (gitignored). Three tables:

| Table | Key fields |
|-------|-----------|
| `assignment` | id, title, description, tags (JSON), presentation_config (JSON), file_path, github_url |
| `feedback` | id, assignment_id, content, parent_id (threading), role, is_review |
| `assignmentversion` | id, assignment_id, change_type (presentation/substance), file_snapshot_path |

`presentation_config` JSON shape:
```json
{ "primary_color": "#1a56db", "accent_color": "#ff5a1f", "font_family": "Inter, sans-serif", "logo_url": null, "header_text": null }
```

---

## File Storage

```
backend/storage/
  {assignment_id}/
    original/     ← immutable source files (never modified)
    snapshots/    ← v{version_id}.json presentation config snapshots
```
The entire `storage/` directory is gitignored. It is recreated on import.

---

## Adding a New API Route

1. Create or add to a file in `backend/routes/`
2. Define an `APIRouter` with `prefix` and `tags`
3. Register it in `backend/routes/__init__.py`
4. Include it in `backend/main.py` with `app.include_router(router, prefix="/api")`
5. Add a corresponding function in `frontend/src/lib/api.js`

---

## Common Pitfalls

- **Running uvicorn from the wrong directory**: Must be run from `lms-platform/`, not the workspace root, because `backend` is a relative package name.
- **Branch mismatch on import**: The github_service auto-detects the default branch via the GitHub metadata API. If a user includes a branch in the URL (`/tree/main`) it takes precedence.
- **iframe sandbox too restrictive**: `allow-downloads` is required for SheetJS `.xlsx` export in assignment HTML. Don't tighten the sandbox without testing assignment functionality.
- **SQLModel JSON columns**: Tags and presentation_config use `sa_column=Column(JSON)`. Pydantic validation does not run on these — validate in the route layer if needed.
