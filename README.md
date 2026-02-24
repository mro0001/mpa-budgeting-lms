# MPA Budgeting LMS

An AI-enabled Learning Management System for Local Government budgeting assignments in MPA (Master of Public Administration) courses.

Professors can **import** or **upload** self-contained HTML assignments, define and enforce **assignment standards**, run **AI conformance checks**, conduct **structured expert reviews**, customize **visual presentation** without touching the source, build **curriculum sequences**, and use the **AI Agent** to generate prompts for creating new conforming assignments from raw course material.

---

## Features

- **Assignment Standards** — define structural, pedagogical, and technical requirements for conforming assignments, based on the excel-revenue-forecasting reference pattern (sidebar navigation, progressive tasks, verification, discussion questions, answer key)
- **AI Conformance Checking** — evaluate any assignment against a standard; the AI reads the HTML and reports which criteria are met, which are missing, and gives specific improvement recommendations with a 0-100% score
- **AI Agent Prompt Generator** — the "vibe coding" feature: describe your raw course material, select a standard and optionally a reference assignment, and the AI generates a detailed, copy-pasteable prompt you can hand to Claude, Cursor, or Copilot to build a conforming interactive assignment from scratch
- **GitHub Import + File Upload** — paste a GitHub repo URL (auto-detects default branch) or drag-and-drop an HTML file directly; AI generates a catalog description + tags in the background
- **Presentation / Substance Separation** — change colors, fonts, and header banners without ever modifying the assignment's HTML; the "Download Original" button always delivers the pristine source file
- **Structured Expert Reviews** — formal review workflow (submitted > under review > approved/needs revision) with ratings, strengths, weaknesses, and suggested changes; review status shown on catalog cards and dashboard
- **Threaded Feedback** — professors, experts, and students comment with threaded replies; AI "Summarize Themes" button distills patterns across all comments
- **Assignment Connections** — link assignments as prerequisites, recommended next steps, or related topics to build curriculum sequences; `GET /api/learning-paths` returns the full graph
- **Quality Dashboard** — completeness metrics (descriptions, objectives, reviews, conformance), review status breakdown, pending review queue, difficulty distribution, dynamic tag cloud, and top downloads

---

## Quick Start

**Prerequisites**: Python ≥ 3.12 with [uv](https://docs.astral.sh/uv/), Node.js ≥ 18

### 1. Clone & configure
```bash
git clone https://github.com/mro0001/mpa-budgeting-lms.git
cd mpa-budgeting-lms
cp .env.example .env       # fill in MINDROUTER2_URL and MINDROUTER2_KEY
```

### 2. Backend
```bash
# From the repo root (mpa-budgeting-lms/)
uv sync
uv run uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

### 4. Verify
```bash
curl http://localhost:8000/api/health
# → {"status":"ok","service":"MPA Budgeting LMS"}
```

Open `http://localhost:5173` and click **Import Assignment** to import your first assignment.

---

## Environment Variables

Create a `.env` file in the repo root (never commit it):

```env
MINDROUTER2_URL=https://mindrouter.uidaho.edu
MINDROUTER2_KEY=your_key_here
```

These credentials power the AI features (description generation, tag suggestion, feedback analysis). The platform works without them — AI features simply return `null`/empty.

---

## Project Structure

```
mpa-budgeting-lms/
├── backend/
│   ├── main.py                   FastAPI app entry point
│   ├── database.py               SQLite engine + session factory
│   ├── models/
│   │   ├── assignment.py         Assignment table + request/response schemas
│   │   ├── feedback.py           Feedback/comment model
│   │   └── version.py            Presentation change history
│   ├── routes/
│   │   ├── assignments.py        CRUD, /serve, /download, /import
│   │   ├── feedback.py           Threaded comments + AI theme analysis
│   │   ├── presentation.py       Visual config updates + version history
│   │   └── dashboard.py          Platform-wide statistics
│   ├── services/
│   │   ├── file_service.py       storage/ directory management
│   │   ├── github_service.py     GitHub Tree API + raw file download
│   │   └── ai_service.py         MindRouter2: description, tags, themes
│   └── storage/                  Assignment files (gitignored)
│       └── {id}/
│           ├── original/         Immutable source files
│           └── snapshots/        Versioned presentation config snapshots
└── frontend/
    ├── vite.config.js            Proxy /api → :8000
    └── src/
        ├── lib/api.js            Axios client for all endpoints
        ├── App.jsx               Router + React Query provider
        ├── components/
        │   ├── Layout.jsx        Navigation shell
        │   ├── AssignmentCard.jsx Catalog grid card
        │   ├── PresentationEditor.jsx Color/font/banner controls
        │   └── FeedbackThread.jsx Threaded comments + AI analysis
        └── pages/
            ├── Home.jsx           Catalog with search/filter/review status
            ├── AssignmentDetail.jsx iframe + 5-tab panel (View/Customize/Discuss/Reviews/Connections)
            ├── Submit.jsx         GitHub import + file upload
            ├── Standards.jsx      View/create assignment standards
            ├── AgentPrompt.jsx    AI Agent prompt generator
            └── Dashboard.jsx      Quality metrics + review queue + tag cloud
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health check |
| | **Assignments** | |
| GET | `/api/assignments` | List catalog (search, subject_area, course_level filters) |
| GET | `/api/assignments/{id}` | Single assignment with all metadata |
| POST | `/api/assignments/import` | Import from GitHub URL (auto-detects branch) |
| POST | `/api/assignments/upload` | Direct HTML file upload (multipart form) |
| PATCH | `/api/assignments/{id}` | Update substance metadata |
| DELETE | `/api/assignments/{id}` | Delete assignment + files |
| GET | `/api/assignments/{id}/serve` | HTML with presentation CSS injected (iframe src) |
| GET | `/api/assignments/{id}/download` | Original unmodified file download |
| | **Presentation** | |
| PUT | `/api/assignments/{id}/presentation` | Update visual config (creates version record) |
| GET | `/api/assignments/{id}/presentation/history` | List presentation version history |
| | **Feedback & Reviews** | |
| GET | `/api/assignments/{id}/feedback` | List threaded comments |
| POST | `/api/assignments/{id}/feedback` | Add comment |
| GET | `/api/assignments/{id}/feedback/themes` | AI theme analysis of all feedback |
| GET | `/api/assignments/{id}/reviews` | List structured expert reviews |
| POST | `/api/assignments/{id}/reviews` | Submit a formal review |
| PATCH | `/api/reviews/{id}/status` | Update review status (workflow transition) |
| | **Standards & Conformance** | |
| GET | `/api/standards` | List active assignment standards |
| POST | `/api/standards` | Create a new standard |
| GET | `/api/standards/{id}` | Get standard with all criteria |
| PUT | `/api/standards/{id}` | Update a standard |
| POST | `/api/standards/{id}/check/{assignment_id}` | AI conformance check |
| POST | `/api/standards/{id}/generate-prompt` | AI Agent prompt generator |
| | **Connections** | |
| GET | `/api/assignments/{id}/connections` | List connections for an assignment |
| POST | `/api/connections` | Create a connection (prerequisite/recommended/related) |
| DELETE | `/api/connections/{id}` | Delete a connection |
| GET | `/api/learning-paths` | Full curriculum graph (nodes + edges) |
| | **Dashboard** | |
| GET | `/api/dashboard/stats` | Global platform statistics |
| GET | `/api/dashboard/quality` | Completeness + review + conformance metrics |
| GET | `/api/dashboard/top-assignments` | Most-downloaded assignments |
| GET | `/api/dashboard/recent-feedback` | Latest feedback |
| GET | `/api/dashboard/pending-reviews` | Assignments needing review attention |
| GET | `/api/dashboard/tag-cloud` | Tag frequency counts |
| GET | `/api/dashboard/subject-areas` | Dynamic list of subjects in use |

---

## Key Design Decisions

### Presentation / Substance Separation
The original HTML file is an immutable artifact. `GET /serve` injects a `<style>` block with CSS custom properties (`--lms-primary`, `--lms-accent`, `--lms-font`) before the `</head>` tag at request time — nothing is written to disk. `GET /download` bypasses this entirely. This means:
- **Professors always share the original, unbranded assignment**
- **Course-specific branding is ephemeral and per-viewer**
- **No risk of accidentally corrupting interactive assignment logic**

### iframe Sandbox
Assignments run in `<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-downloads">`. The `allow-same-origin` flag is required because assignment JavaScript fetches relative asset paths (spreadsheet templates, images). The `allow-downloads` flag is required for SheetJS `.xlsx` export buttons.

### AI as Background Enrichment
AI description/tag generation runs as a FastAPI `BackgroundTask` after the import endpoint returns. The UI shows the assignment immediately (with empty description) and the AI content appears on the next query refresh. This keeps the import response fast even when the AI gateway is slow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI 0.132 + Uvicorn |
| ORM / DB | SQLModel + SQLite |
| HTTP client | httpx (async) |
| File I/O | aiofiles |
| AI gateway | MindRouter2 (Anthropic-compatible) |
| Frontend framework | React 19 + Vite 7 |
| Styling | TailwindCSS 3 |
| Server state | TanStack React Query v5 |
| Routing | React Router v7 |
| HTTP client | Axios |

---

## Contributing

See [CLAUDE.md](./CLAUDE.md) for architecture details and common pitfalls.

---

## License

MIT
