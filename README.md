# MPA Budgeting LMS

An AI-enabled Learning Management System for Local Government budgeting assignments in MPA (Master of Public Administration) courses.

Professors can **import** self-contained HTML assignments from GitHub, **customize** their visual appearance without touching the source, **annotate** them with learning objectives, and **discuss** them with colleagues — all in one platform.

---

## Features

- **GitHub Import** — paste any GitHub repo URL; the platform downloads all files, detects the entry HTML, and auto-generates a catalog description + tags via AI (background task)
- **Presentation / Substance Separation** — change colors, fonts, and header banners without ever modifying the assignment's HTML. The "Download Original" button always delivers the pristine source file
- **Interactive iframe Rendering** — assignments run in an isolated `<iframe>` so their JavaScript (Chart.js, SheetJS, interactive quizzes) works perfectly without conflicting with React
- **Threaded Feedback** — professors, subject-matter experts, and students can comment with threaded replies; an AI "Summarize Themes" button distills patterns across all comments
- **Dashboard** — live stats on downloads, top assignments, recent feedback, and a topic tag cloud

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
            ├── Home.jsx          Catalog with search/filter
            ├── AssignmentDetail.jsx iframe + 3-tab detail panel
            ├── Submit.jsx        GitHub import wizard
            └── Dashboard.jsx     Stats + tag cloud
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health check |
| GET | `/api/assignments` | List catalog (supports `search`, `subject_area`, `course_level`) |
| GET | `/api/assignments/{id}` | Single assignment |
| POST | `/api/assignments/import` | Import from GitHub URL |
| PATCH | `/api/assignments/{id}` | Update substance metadata |
| DELETE | `/api/assignments/{id}` | Delete assignment + files |
| GET | `/api/assignments/{id}/serve` | HTML with presentation CSS injected (iframe src) |
| GET | `/api/assignments/{id}/download` | Original unmodified file download |
| PUT | `/api/assignments/{id}/presentation` | Update visual config (creates version record) |
| GET | `/api/assignments/{id}/presentation/history` | List presentation versions |
| GET | `/api/assignments/{id}/feedback` | List threaded comments |
| POST | `/api/assignments/{id}/feedback` | Add comment |
| DELETE | `/api/assignments/{id}/feedback/{fid}` | Delete comment |
| GET | `/api/assignments/{id}/feedback/themes` | AI analysis of all feedback |
| GET | `/api/dashboard/stats` | Global platform statistics |
| GET | `/api/dashboard/top-assignments` | Most-downloaded assignments |
| GET | `/api/dashboard/recent-feedback` | Latest feedback across all assignments |
| GET | `/api/dashboard/tag-cloud` | Tag frequency counts |

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
