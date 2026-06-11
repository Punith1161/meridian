from datetime import datetime, timezone

from app.models import CalendarEvent, Task


def _elapsed_seconds_since(started_at: datetime, now: datetime | None = None) -> int:
    current = now or datetime.now(timezone.utc).replace(tzinfo=None)
    return max(0, int((current - started_at).total_seconds()))


def serialize_task(task: Task) -> dict:
    running = task.timer_started_at is not None
    spent = task.time_spent
    if running and task.timer_started_at is not None:
        spent += _elapsed_seconds_since(task.timer_started_at)

    return {
        "id": task.id,
        "title": task.title,
        "priority": task.priority,
        "status": task.status,
        "due_date": task.due_date,
        "time_estimate": task.time_estimate,
        "time_spent": spent,
        "timer_running": running,
        "position": task.position,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


def serialize_calendar_event(event: CalendarEvent) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "start_at": event.start_at,
        "end_at": event.end_at,
        "all_day": event.all_day,
        "location": event.location,
        "description": event.description,
        "color": event.color,
        "recurrence": event.recurrence if event.recurrence else "none",
        "reminder_minutes": event.reminder_minutes,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
    }
