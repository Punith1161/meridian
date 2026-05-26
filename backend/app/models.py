from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="owner")
    notes = relationship("Note", back_populates="owner")
    sheets = relationship("Sheet", back_populates="owner")
    activity = relationship("TaskActivity", back_populates="owner")


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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="tasks")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="Untitled")
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="notes")


class Sheet(Base):
    __tablename__ = "sheets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    data = Column(JSON, default={"cols": [], "rows": []})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="activity")