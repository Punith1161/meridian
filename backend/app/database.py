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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
