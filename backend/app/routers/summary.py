from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Task, User
from app.schemas import TodaySummary
from app.serializers import serialize_task

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/today", response_model=TodaySummary)
def today_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.position.asc())
        .all()
    )

    today_tasks = [t for t in tasks if t.due_date == today or t.status != "done"]
    serialized = [serialize_task(t) for t in today_tasks]

    done = sum(1 for t in today_tasks if t.status == "done")
    total_time = sum(s["time_spent"] for s in serialized)
    running_id = next((t.id for t in tasks if t.timer_started_at is not None), None)

    return TodaySummary(
        tasks_today=serialized,
        tasks_done=done,
        tasks_total=len(today_tasks),
        total_time_tracked=total_time,
        running_task_id=running_id,
    )
