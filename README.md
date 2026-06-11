# MERIDIAN

A local-first personal productivity workspace. Self-hosted, no cloud dependency.

**Stack:** FastAPI · SQLite · React 18 · Vite · TypeScript · TailwindCSS v4

---

## Modules

| | Module | What it does |
|---|--------|--------------|
| `⌘1` | **Kanban** | Drag-and-drop task board |
| `⌘2` | **Today** | Daily dashboard — tasks due, time tracked, progress |
| `⌘3` | **All Tasks** | Full task table with sorting and time metrics |
| `⌘4` | **Notes** | Rich-text editor with notebooks |
| `⌘5` | **Sheets** | Spreadsheet with formula support |
| `⌘6` | **Calendar** | Event calendar with recurrence |
| `⌘7` | **Habits** | Daily habit tracker with streaks and heatmap |
| `⌘8` | **Activity** | Full audit log of all task actions |

---

## Setup

**Requirements:** Python 3.11+, Node 18+

```bash
# Linux / macOS
bash setup.sh
bash start.sh

# Windows
setup.bat
# then start backend and frontend manually (see below)
```

**Manual start:**
```bash
# Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173**

---

## Structure

```
meridian/
├── backend/
│   └── app/
│       ├── main.py         FastAPI entry, CORS, startup
│       ├── models.py       SQLAlchemy ORM models
│       ├── schemas.py      Pydantic schemas
│       ├── database.py     DB engine + migrations
│       ├── auth.py         JWT auth (HS256, 7-day tokens)
│       └── routers/        One file per feature
└── frontend/
    └── src/
        ├── pages/          One file per page
        ├── components/     Sidebar, TaskCard, TaskDetailSheet
        ├── context/        AuthContext
        └── utils/api.ts    Typed fetch client
```

---

## API Docs

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

---

## Environment

`backend/.env` (auto-generated on first run):

| Variable | Default |
|----------|---------|
| `DATABASE_URL` | `sqlite:///./meridian.db` |
| `SECRET_KEY` | auto-generated |
| `FRONTEND_URLS` | `http://localhost:5173` |
