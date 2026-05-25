import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.database import engine, Base, run_startup_migrations
from app.routers import activity, auth, tasks, timer, notes, sheets, summary

load_dotenv()

app = FastAPI(title="MERIDIAN API")

frontend_urls = os.getenv("FRONTEND_URLS")
if frontend_urls:
    origins = [u.strip() for u in frontend_urls.split(",") if u.strip()]
else:
    origins = [os.getenv("FRONTEND_URL", "http://localhost:8080")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
run_startup_migrations()

app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(timer.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(sheets.router, prefix="/api")
app.include_router(summary.router, prefix="/api")
app.include_router(activity.router, prefix="/api")


@app.get("/api/healthz")
def health_check():
    return {"status": "ok"}


@app.get("/health")
def health_legacy_check():
    return {"status": "ok"}