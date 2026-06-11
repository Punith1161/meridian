"""
MERIDIAN FastAPI backend entrypoint.
"""
import os
import re
import secrets

from dotenv import load_dotenv

load_dotenv()


def _ensure_secret_key() -> None:
    """Replace placeholder SECRET_KEY with a cryptographically secure one on first run."""
    current = os.getenv("SECRET_KEY", "")
    if current and "PLACEHOLDER" not in current and "replace-with" not in current.lower():
        return

    new_key = secrets.token_hex(32)
    os.environ["SECRET_KEY"] = new_key

    env_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            content = f.read()
        if "SECRET_KEY=" in content:
            content = re.sub(r"^SECRET_KEY=.*$", f"SECRET_KEY={new_key}", content, flags=re.MULTILINE)
        else:
            content += f"\nSECRET_KEY={new_key}\n"
        with open(env_path, "w") as f:
            f.write(content)
    print("[MERIDIAN] Generated new SECRET_KEY")


_ensure_secret_key()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, run_schema_migrations, run_habit_migrations, run_notes_v2_migrations
from app.routers import activity, auth, calendar, habits, notes, sheets, summary, tasks, timer

app = FastAPI(
    title="MERIDIAN API",
    description="Local-first personal productivity workspace",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

frontend_urls = os.getenv("FRONTEND_URLS")
if frontend_urls:
    origins = [u.strip() for u in frontend_urls.split(",") if u.strip()]
else:
    origins = [os.getenv("FRONTEND_URL", "http://localhost:5173")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
run_schema_migrations()
run_habit_migrations()
run_notes_v2_migrations()

app.include_router(auth.router,     prefix="/api")
app.include_router(tasks.router,    prefix="/api")
app.include_router(timer.router,    prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(notes.router,    prefix="/api")
app.include_router(sheets.router,   prefix="/api")
app.include_router(summary.router,  prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(habits.router,   prefix="/api")


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/healthz", tags=["health"])
def healthz():
    return {"status": "ok"}
