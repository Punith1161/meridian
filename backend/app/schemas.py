from pydantic import BaseModel, ConfigDict
from datetime import datetime


class UserCreate(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskCreate(BaseModel):
    title: str
    priority: str = "medium"
    due_date: str | None = None
    time_estimate: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    priority: str | None = None
    due_date: str | None = None
    time_estimate: int | None = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    priority: str
    status: str
    due_date: str | None
    time_estimate: int | None
    time_spent: int
    timer_started_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoteCreate(BaseModel):
    title: str = "Untitled"
    content: str | None = None


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SheetCreate(BaseModel):
    name: str
    data: dict | None = None


class SheetUpdate(BaseModel):
    name: str | None = None
    data: dict | None = None


class SheetResponse(BaseModel):
    id: int
    user_id: int
    name: str
    data: dict
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str