# MERIDIAN

> **Local-first personal productivity workspace** — Kanban · Today · Tasks · Calendar · Habits · Notes · Sheets · Activity

A self-hosted, offline-capable workspace that installs on **Windows and Linux** with zero cloud dependency.

---

## What's Inside

| Module | Description |
|--------|-------------|
| **Today** | Dashboard with today's tasks, progress ring, time tracked |
| **All Tasks** | Full task table with sorting, grouping, efficiency metrics |
| **Calendar** | Full Outlook-style event calendar with drag-and-drop |
| **Habits** | Daily habit tracker with streaks, heatmap, milestone badges |
| **Notes** | OneNote-style rich block editor with notebooks |
| **Kanban** | Drag-and-drop task board |

**Stack:** FastAPI · SQLite · React 18 · Vite · TypeScript · TailwindCSS v4 · Electron

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ LTS | [nodejs.org](https://nodejs.org) |
| Git | any | [git-scm.com](https://git-scm.com) |

### One-Command Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/meridian.git
cd meridian

# Linux / macOS
bash setup.sh

# Windows (double-click OR run in Command Prompt)
setup.bat
```

The setup script:
- Checks Python 3.11+ and Node 18+
- Creates a Python virtual environment in `backend/.venv`
- Installs all Python and Node dependencies
- Creates `backend/.env` with a randomly generated `SECRET_KEY`
- Creates VS Code workspace settings with one-click debug launch

### Start the App

```bash
# Linux / macOS — starts both backend and frontend
bash start.sh

# Windows — two terminals
# Terminal 1:
cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload
# Terminal 2:
cd frontend && npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## VS Code Developer Setup

After running setup, open VS Code in the project root:

```bash
code .
```

### Recommended Extensions

Install these for the best experience:

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "ms-python.debugpy"
  ]
}
```

Or run:
```
code --install-extension ms-python.python
code --install-extension charliermarsh.ruff
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
```

### One-Click Debug Launch

The setup script creates `.vscode/launch.json` with three launch configurations:

1. **MERIDIAN Backend** — starts `uvicorn` with `--reload`
2. **MERIDIAN Frontend** — starts `vite dev`
3. **MERIDIAN Full Stack** — starts both simultaneously (use this one!)

**How to use:**
1. Open the **Run & Debug** panel (`Ctrl+Shift+D` / `Cmd+Shift+D`)
2. Select **"MERIDIAN Full Stack"** from the dropdown
3. Press **▶ Start Debugging** (or `F5`)

Both terminals start in the integrated terminal. `Ctrl+C` in either stops both.

### Making Code Changes

**Backend changes:**
- Files in `backend/app/` — uvicorn auto-reloads on save (because of `--reload`)
- Adding new endpoints: create/edit in `backend/app/routers/`, register in `main.py`
- Schema changes: edit `models.py`, add migration in `database.py`

**Frontend changes:**
- Vite HMR (hot module reload) applies changes instantly without refresh
- Pages: `frontend/src/pages/`
- Components: `frontend/src/components/`
- API calls: `frontend/src/utils/api.ts`

---

## Project Structure

```
meridian/
├── backend/                    Python FastAPI app
│   ├── app/
│   │   ├── main.py             FastAPI entrypoint, CORS, startup
│   │   ├── models.py           SQLAlchemy ORM models
│   │   ├── schemas.py          Pydantic request/response schemas
│   │   ├── database.py         DB engine, session, migrations
│   │   ├── auth.py             JWT auth (HS256, 7-day tokens)
│   │   ├── serializers.py      ORM → dict helpers (live timer calc)
│   │   ├── activity.py         Audit log helper
│   │   └── routers/
│   │       ├── auth.py         POST /api/auth/register, /login, /me
│   │       ├── tasks.py        CRUD + status patch + bulk reorder
│   │       ├── timer.py        POST /api/tasks/{id}/timer/start|stop
│   │       ├── calendar.py     CRUD /api/calendar/events
│   │       ├── notes.py        CRUD /api/notes + notebooks
│   │       ├── habits.py       CRUD + toggle + stats
│   │       ├── sheets.py       CRUD /api/sheets
│   │       ├── summary.py      GET /api/summary/today
│   │       └── activity.py     GET /api/activity
│   ├── .env                    Secrets (auto-generated, do NOT commit)
│   ├── .env.example            Template for new setups
│   ├── requirements.txt        Pinned Python dependencies
│   └── meridian.db             SQLite database (auto-created)
│
├── frontend/                   React app
│   ├── src/
│   │   ├── main.tsx            App entry point
│   │   ├── App.tsx             Router + auth gate + layout
│   │   ├── pages/              One file per page
│   │   ├── components/         Sidebar, TaskCard, TaskDetailSheet
│   │   ├── context/            AuthContext (JWT management)
│   │   ├── styles/             Global CSS, FullCalendar theme, Tiptap theme
│   │   └── utils/              api.ts, formatTime.ts
│   ├── electron-main.cjs       Electron main process
│   ├── electron-preload.cjs    Electron context bridge
│   ├── package.json            Dependencies + build config
│   └── vite.config.ts          Vite + proxy config
│
├── setup.sh                    Linux/macOS setup script
├── setup.bat                   Windows setup script
├── start.sh                    Start both servers (Linux/macOS)
└── README.md                   This file
```

---

## API Documentation

FastAPI auto-generates interactive API docs:

- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc
- **OpenAPI JSON:** http://localhost:8000/api/openapi.json

---

## Building Desktop Apps

### Windows installer (.exe)
```bash
cd frontend
npm run package:win
# Output: dist-electron/MERIDIAN Setup *.exe
```

### Linux AppImage
```bash
cd frontend
npm run package:linux
# Output: dist-electron/MERIDIAN-*.AppImage
```

**Prerequisites for Electron packaging:**
1. Python backend must be bundled. See `electron-main.cjs` for details.
2. For Windows: run on a Windows machine or use WSL2 + wine for cross-compilation.

---

## Environment Variables

`backend/.env` (auto-generated by setup script):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./meridian.db` | Database connection string |
| `SECRET_KEY` | auto-generated | JWT signing key (64 hex chars) |
| `FRONTEND_URLS` | `http://localhost:5173` | CORS allowed origins |

To use PostgreSQL instead of SQLite:
```
DATABASE_URL=postgresql://user:password@localhost:5432/meridian
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + 1` | Today |
| `Ctrl/⌘ + 2` | Today (alias) |
| `Ctrl/⌘ + 3` | All Tasks |
| `Ctrl/⌘ + 4` | Notes |
| `Ctrl/⌘ + 5` | Calendar |
| `Ctrl/⌘ + 6` | Habits |
| `Ctrl/⌘ + N` | New note (in Notes page) |
| `Ctrl/⌘ + B` | Bold (in editor) |
| `Ctrl/⌘ + I` | Italic (in editor) |

---

## Bugs Fixed

| # | Bug | Fix |
|---|-----|-----|
| 1 | `datetime.utcnow()` Python 3.12 deprecation | Replaced with `datetime.now(timezone.utc)` everywhere |
| 2 | `SECRET_KEY=replace-with-a-long-random-secret` placeholder | Auto-generated on first run |
| 3 | Timer keeps running after task marked done | `_auto_stop_timer()` called on status change and drag-to-done |
| 4 | Duplicate icons in sidebar (Today + Calendar both `CalendarDays`) | Today → `LayoutDashboard`, Calendar → `CalendarRange` |
| 5 | `⌘6`/`⌘7` shortcuts inverted vs sidebar labels | Fixed in App.tsx |
| 6 | `react-quill` React 18 StrictMode warnings | Replaced with Tiptap |
| 7 | No search on notes | Added `?search=` query param with ILIKE |
| 8 | No notebook support for notes | Full Notebooks feature |
| 9 | `psycopg2-binary` and `passlib[bcrypt]` unused deps | Removed from requirements.txt |
| 10 | Workspace imports (`@workspace/api-client-react`) broken in standalone setup | Replaced with direct `api.ts` calls |

---

## License

MIT
