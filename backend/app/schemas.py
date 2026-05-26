from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TaskPriority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class TaskStatus(str, Enum):
    todo = "todo"
    inprogress = "inprogress"
    done = "done"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1)
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.todo
    due_date: date | None = None
    time_estimate: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    priority: TaskPriority | None = None
    due_date: date | None = None
    time_estimate: int | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskReorderItem(BaseModel):
    task_id: int
    position: int
    status: TaskStatus


class TaskReorderInput(BaseModel):
    items: list[TaskReorderItem]


class TaskResponse(BaseModel):
    id: int
    title: str
    priority: TaskPriority
    status: TaskStatus
    due_date: date | None
    time_estimate: int | None
    time_spent: int
    timer_running: bool = False
    position: int = 0
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
    name: str
    data: dict
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int | None = None


class TimerState(BaseModel):
    time_spent: int
    timer_running: bool


class ActivityEntry(BaseModel):
    id: int
    task_id: int
    task_title: str
    action: str
    from_value: str | None = None
    to_value: str | None = None
    metadata: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TodaySummary(BaseModel):
    tasks_today: list[TaskResponse]
    tasks_done: int
    tasks_total: int
    total_time_tracked: int
    running_task_id: int | None


class TaskStats(BaseModel):
    by_status: dict[str, int]
    by_priority: dict[str, int]
    total: int