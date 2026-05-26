from datetime import datetime, timezone

from app.models import Task


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
