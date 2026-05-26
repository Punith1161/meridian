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
    payload: str | None
    if metadata is None:
        payload = None
    elif isinstance(metadata, str):
        payload = metadata
    else:
        payload = json.dumps(metadata)

    db.add(
        TaskActivity(
            task_id=task.id,
            user_id=user.id,
            task_title=task.title,
            action=action,
            from_value=from_value,
            to_value=to_value,
            metadata_text=payload,
        )
    )
