MERIDIAN FastAPI Backend

Overview
- This backend now matches the frontend API contract used by the React app.
- Base API prefix: `/api`
- Health endpoint: `/api/healthz`

Key endpoints
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Tasks: `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/status`, `/api/tasks/reorder`
- Timer: `/api/tasks/{id}/timer/start`, `/api/tasks/{id}/timer/stop`, `/api/tasks/{id}/timer`
- Notes: `/api/notes`
- Sheets: `/api/sheets`
- Summary: `/api/summary/today`, `/api/summary/task-stats`
- Activity: `/api/activity`

Environment variables
- `DATABASE_URL` (default: `sqlite:///./meridian.db`)
- `SECRET_KEY` (required for production)
- `ALGORITHM` (default: `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES` (default: `10080`)
- `FRONTEND_URLS` (comma-separated allowed origins)

Development run
1. Create and activate virtual env.
2. Install dependencies:
	- `pip install -r requirements.txt`
3. Start server:
	- `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

Production run (recommended)
- Use a managed Postgres database with `DATABASE_URL`.
- Set a strong `SECRET_KEY`.
- Run behind a reverse proxy (Nginx/Caddy) with TLS.
- Serve with multiple workers:
  - `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2`

Notes
- On startup, additive schema bootstrap runs for older databases (for missing task `position` column).
- For long-term production migrations, adopt Alembic.
