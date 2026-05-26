from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import TaskActivity, User
from app.schemas import ActivityEntry

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityEntry])
def list_activity(
    limit: int = Query(default=100, ge=1, le=500),
    task_id: int | None = Query(default=None, alias="taskId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(TaskActivity).filter(TaskActivity.user_id == current_user.id)
    if task_id is not None:
        query = query.filter(TaskActivity.task_id == task_id)

    entries = query.order_by(TaskActivity.created_at.desc()).limit(limit).all()
    return [
        {
            "id": entry.id,
            "task_id": entry.task_id,
            "task_title": entry.task_title,
            "action": entry.action,
            "from_value": entry.from_value,
            "to_value": entry.to_value,
            "metadata": entry.metadata_text,
            "created_at": entry.created_at,
        }
        for entry in entries
    ]
