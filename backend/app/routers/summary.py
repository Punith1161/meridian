from fastapi import APIRouter, Depends
from datetime import date
from sqlalchemy.orm import Session
from app.auth import get_current_user
from app.database import get_db
from app.models import Task, User
from app.schemas import TaskStats, TodaySummary
from app.serializers import serialize_task

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/today", response_model=TodaySummary)
def get_today_summary(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    today = date.today()

    all_tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    today_tasks = [t for t in all_tasks if t.due_date == today]

    serialized_all = [serialize_task(t) for t in all_tasks]
    serialized_today = [serialize_task(t) for t in today_tasks]
    total_time_tracked = sum(t["time_spent"] for t in serialized_all)
    done_count = sum(1 for t in today_tasks if t.status == "done")

    running_task_id = None
    for task in all_tasks:
        if task.timer_started_at:
            running_task_id = task.id
            break

    return {
        "tasks_today": serialized_today,
        "tasks_done": done_count,
        "tasks_total": len(serialized_today),
        "total_time_tracked": total_time_tracked,
        "running_task_id": running_task_id,
    }


@router.get("/task-stats", response_model=TaskStats)
def get_task_stats(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    by_status = {"todo": 0, "inprogress": 0, "done": 0}
    by_priority = {"high": 0, "medium": 0, "low": 0}
    for task in tasks:
        if task.status in by_status:
            by_status[task.status] += 1
        if task.priority in by_priority:
            by_priority[task.priority] += 1

    return {"by_status": by_status, "by_priority": by_priority, "total": len(tasks)}
