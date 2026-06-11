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


class CalendarEventCreate(BaseModel):
    title: str = Field(min_length=1)
    start_at: datetime
    end_at: datetime
    all_day: bool = False
    location: str | None = None
    description: str | None = None
    color: str | None = None
    recurrence: str = "none"
    reminder_minutes: int | None = None


class CalendarEventUpdate(BaseModel):
    title: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    all_day: bool | None = None
    location: str | None = None
    description: str | None = None
    color: str | None = None
    recurrence: str | None = None
    reminder_minutes: int | None = None


class CalendarEventResponse(BaseModel):
    id: int
    title: str
    start_at: datetime
    end_at: datetime
    all_day: bool
    location: str | None
    description: str | None
    color: str | None
    recurrence: str
    reminder_minutes: int | None
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


# ── Habit schemas ─────────────────────────────────────────────────────────────

class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    color: str = "#7c3aed"
    icon: str = "⭐"
    frequency: str = "daily"
    frequency_days: list[int] | None = None
    target_count: int = 1
    position: int = 0


class HabitUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    frequency: str | None = None
    frequency_days: list[int] | None = None
    target_count: int | None = None
    position: int | None = None
    archived: bool | None = None


class HabitResponse(BaseModel):
    id: int
    name: str
    description: str | None
    color: str
    icon: str
    frequency: str
    frequency_days: list[int] | None
    target_count: int
    position: int
    archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HabitEntryToggle(BaseModel):
    date: date
    count: int = 1


class HabitEntryResponse(BaseModel):
    id: int
    habit_id: int
    date: date
    count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HabitStats(BaseModel):
    habit_id: int
    current_streak: int
    longest_streak: int
    completion_rate_30d: float   # 0.0–1.0
    total_completions: int
    entries_last_365: dict[str, int]   # "YYYY-MM-DD" -> count


class HabitWithStats(BaseModel):
    habit: HabitResponse
    stats: HabitStats
    today_entry: HabitEntryResponse | None


# ── Notebook schemas ──────────────────────────────────────────────────────────

class NotebookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = "#7c3aed"
    position: int = 0


class NotebookUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    position: int | None = None


class NotebookResponse(BaseModel):
    id: int
    name: str
    color: str
    position: int
    note_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Extended Note schemas ─────────────────────────────────────────────────────

class NoteCreateV2(BaseModel):
    title: str = "Untitled"
    content: str | None = None          # Tiptap JSON string
    notebook_id: int | None = None
    pinned: bool = False
    tags: list[str] = []


class NoteUpdateV2(BaseModel):
    title: str | None = None
    content: str | None = None
    notebook_id: int | None = None
    pinned: bool | None = None
    tags: list[str] | None = None


class NoteResponseV2(BaseModel):
    id: int
    title: str
    content: str | None
    notebook_id: int | None
    pinned: bool
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
