import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def run_schema_migrations() -> None:
    """Apply small additive schema fixes for legacy deployments."""
    insp = inspect(engine)
    table_names = set(insp.get_table_names())
    if "tasks" not in table_names:
        return

    task_columns = {col["name"] for col in insp.get_columns("tasks")}
    with engine.begin() as conn:
        if "position" not in task_columns:
            conn.execute(
                text("ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0")
            )

    if "calendar_events" in table_names:
        cal_columns = {col["name"] for col in insp.get_columns("calendar_events")}
        with engine.begin() as conn:
            if "recurrence" not in cal_columns:
                conn.execute(
                    text("ALTER TABLE calendar_events ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none'")
                )
            if "reminder_minutes" not in cal_columns:
                conn.execute(
                    text("ALTER TABLE calendar_events ADD COLUMN reminder_minutes INTEGER")
                )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_habit_migrations() -> None:
    """Create habit tables if they don't exist (additive only)."""
    insp = inspect(engine)
    table_names = set(insp.get_table_names())

    if "habits" not in table_names:
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE habits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    name TEXT NOT NULL,
                    description TEXT,
                    color TEXT NOT NULL DEFAULT '#7c3aed',
                    icon TEXT NOT NULL DEFAULT '⭐',
                    frequency TEXT NOT NULL DEFAULT 'daily',
                    frequency_days JSON,
                    target_count INTEGER NOT NULL DEFAULT 1,
                    position INTEGER NOT NULL DEFAULT 0,
                    archived BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME,
                    updated_at DATETIME
                )
            """))

    if "habit_entries" not in table_names:
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE habit_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    habit_id INTEGER NOT NULL REFERENCES habits(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    date DATE NOT NULL,
                    count INTEGER NOT NULL DEFAULT 1,
                    created_at DATETIME,
                    UNIQUE(habit_id, date)
                )
            """))


def run_notes_v2_migrations() -> None:
    """Add notebook table and new note columns if not present."""
    insp = inspect(engine)
    table_names = set(insp.get_table_names())

    # Create notebooks table
    if "notebooks" not in table_names:
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE notebooks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    name TEXT NOT NULL,
                    color TEXT NOT NULL DEFAULT '#7c3aed',
                    position INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME,
                    updated_at DATETIME
                )
            """))

    # Add new columns to existing notes table
    note_cols = {c["name"] for c in insp.get_columns("notes")} if "notes" in table_names else set()

    if "notes" in table_names:
        with engine.begin() as conn:
            if "notebook_id" not in note_cols:
                conn.execute(text("ALTER TABLE notes ADD COLUMN notebook_id INTEGER REFERENCES notebooks(id)"))
            if "pinned" not in note_cols:
                conn.execute(text("ALTER TABLE notes ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT 0"))
            if "tags" not in note_cols:
                conn.execute(text("ALTER TABLE notes ADD COLUMN tags JSON NOT NULL DEFAULT '[]'"))
