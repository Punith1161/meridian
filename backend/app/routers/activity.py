from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import TaskActivity, User
from app.schemas import ActivityEntry

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityEntry])
def list_activity(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(TaskActivity)
        .filter(TaskActivity.user_id == current_user.id)
        .order_by(TaskActivity.created_at.desc())
        .limit(min(limit, 500))
        .all()
    )
    return [
        {
            "id": e.id,
            "task_id": e.task_id,
            "task_title": e.task_title,
            "action": e.action,
            "from_value": e.from_value,
            "to_value": e.to_value,
            "metadata": e.metadata_text,
            "created_at": e.created_at,
        }
        for e in entries
    ]
