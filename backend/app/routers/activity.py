from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import TaskActivity, User
from app.schemas import ActivityEntryResponse

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityEntryResponse])
def list_activity(
    limit: int = Query(default=100, ge=1, le=500),
    taskId: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(TaskActivity).filter(TaskActivity.user_id == current_user.id)
    if taskId is not None:
        query = query.filter(TaskActivity.task_id == taskId)

    rows = query.order_by(TaskActivity.created_at.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "task_id": row.task_id,
            "task_title": row.task_title,
            "action": row.action,
            "from_value": row.from_value,
            "to_value": row.to_value,
            "metadata": row.meta,
            "created_at": row.created_at,
        }
        for row in rows
    ]
