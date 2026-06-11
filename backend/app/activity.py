"""
Immutable audit log helper for task actions.
"""
import json
from sqlalchemy.orm import Session
from app.models import Task, TaskActivity, User


def log_task_activity(
    db: Session,
    *,
    task: Task,
    user: User,
    action: str,
    from_value: str | None = None,
    to_value: str | None = None,
    metadata: dict | str | None = None,
) -> None:
    meta_text: str | None = None
    if isinstance(metadata, dict):
        meta_text = json.dumps(metadata)
    elif isinstance(metadata, str):
        meta_text = metadata

    entry = TaskActivity(
        task_id=task.id,
        user_id=user.id,
        task_title=task.title,
        action=action,
        from_value=from_value,
        to_value=to_value,
        metadata_text=meta_text,
    )
    db.add(entry)
    # Caller is responsible for db.commit()
