from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AuthInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskCreate(BaseModel):
    title: str
    priority: Literal["high", "medium", "low"] = "medium"
    status: Literal["todo", "inprogress", "done"] = "todo"
    due_date: date | None = None
    time_estimate: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    priority: Literal["high", "medium", "low"] | None = None
    due_date: date | None = None
    time_estimate: int | None = None


class TaskStatusUpdate(BaseModel):
    status: Literal["todo", "inprogress", "done"]


class TaskResponse(BaseModel):
    id: int
    title: str
    priority: Literal["high", "medium", "low"]
    status: Literal["todo", "inprogress", "done"]
    due_date: date | None
    time_estimate: int | None
    time_spent: int
    timer_running: bool
    position: int
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


class TaskReorderItem(BaseModel):
    task_id: int
    position: int
    status: Literal["todo", "inprogress", "done"]


class TaskReorderInput(BaseModel):
    items: list[TaskReorderItem]


class TimerStateResponse(BaseModel):
    time_spent: int
    timer_running: bool


class ActivityEntryResponse(BaseModel):
    id: int
    task_id: int
    task_title: str
    action: str
    from_value: str | None
    to_value: str | None
    metadata: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TodaySummaryResponse(BaseModel):
    tasks_today: list[TaskResponse]
    tasks_done: int
    tasks_total: int
    total_time_tracked: int
    running_task_id: int | None


class TaskStatsResponse(BaseModel):
    by_status: dict[str, int]
    by_priority: dict[str, int]
    total: int