import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./meridian.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def run_startup_migrations() -> None:
    """Apply small additive schema updates for local/dev deployments.

    For production, migrate with a dedicated migration tool (e.g. Alembic).
    """
    inspector = inspect(engine)

    with engine.begin() as conn:
        tables = set(inspector.get_table_names())

        if "tasks" in tables:
            if not _has_column(inspector, "tasks", "position"):
                conn.execute(text("ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0"))
