from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=_now)

    tasks = relationship("Task", back_populates="owner")
    notes = relationship("Note", back_populates="owner")
    sheets = relationship("Sheet", back_populates="owner")
    activity = relationship("TaskActivity", back_populates="owner")
    calendar_events = relationship("CalendarEvent", back_populates="owner")
    habits = relationship("Habit", back_populates="owner")
    notebooks = relationship("Notebook", back_populates="owner")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    priority = Column(String, default="medium")
    status = Column(String, default="todo")
    due_date = Column(Date, nullable=True)
    time_estimate = Column(Integer, nullable=True)
    time_spent = Column(Integer, default=0)
    timer_started_at = Column(DateTime, nullable=True)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    owner = relationship("User", back_populates="tasks")




class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#7c3aed", nullable=False)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    owner = relationship("User", back_populates="notebooks")
    notes = relationship("Note", back_populates="notebook")

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="Untitled")
    content = Column(Text, nullable=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), nullable=True)
    pinned = Column(Boolean, default=False, nullable=False)
    tags = Column(JSON, default=[], nullable=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    owner = relationship("User", back_populates="notes")
    notebook = relationship("Notebook", back_populates="notes")


class Sheet(Base):
    __tablename__ = "sheets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    data = Column(JSON, default={"cols": [], "rows": []})
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    owner = relationship("User", back_populates="sheets")


class TaskActivity(Base):
    __tablename__ = "task_activity"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_title = Column(String, nullable=False)
    action = Column(String, nullable=False)
    from_value = Column(String, nullable=True)
    to_value = Column(String, nullable=True)
    metadata_text = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime, default=_now)

    owner = relationship("User", back_populates="activity")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    all_day = Column(Boolean, default=False, nullable=False)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    color = Column(String, nullable=True)
    # Recurrence: "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly"
    recurrence = Column(String, default="none", nullable=False)
    # Reminder in minutes before event (0 = at start, null = no reminder)
    reminder_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    owner = relationship("User", back_populates="calendar_events")


class Habit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#7c3aed", nullable=False)
    icon = Column(String, default="⭐", nullable=False)
    # frequency: "daily" | "weekdays" | "weekends" | "custom"
    frequency = Column(String, default="daily", nullable=False)
    # JSON list of day indices for custom: [0,1,2,3,4,5,6] = Sun..Sat
    frequency_days = Column(JSON, nullable=True)
    # Optional numeric target per day (e.g. drink 8 glasses)
    target_count = Column(Integer, default=1, nullable=False)
    position = Column(Integer, default=0, nullable=False)
    archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    owner = relationship("User", back_populates="habits")
    entries = relationship("HabitEntry", back_populates="habit", cascade="all, delete-orphan")


class HabitEntry(Base):
    __tablename__ = "habit_entries"

    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    count = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=_now)

    habit = relationship("Habit", back_populates="entries")
