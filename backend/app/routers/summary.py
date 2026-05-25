from fastapi import APIRouter, Depends
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task, User
from app.schemas import TaskStatsResponse, TodaySummaryResponse
from app.auth import get_current_user

router = APIRouter(prefix="/summary", tags=["summary"])


def _serialize_task(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "priority": task.priority,
        "status": task.status,
        "due_date": task.due_date,
        "time_estimate": task.time_estimate,
        "time_spent": task.time_spent,
        "timer_running": task.timer_started_at is not None,
        "position": task.position,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


@router.get("/today", response_model=TodaySummaryResponse)
def get_today_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    
    all_tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    today_tasks = [t for t in all_tasks if t.due_date == today]
    
    total_time_tracked = 0
    for task in all_tasks:
        task_spent = task.time_spent
        if task.timer_started_at:
            task_spent += int((datetime.utcnow() - task.timer_started_at).total_seconds())
        total_time_tracked += task_spent
    
    done_count = sum(1 for t in today_tasks if t.status == "done")
    total_today = len(today_tasks)
    
    running_task_id = None
    for task in all_tasks:
        if task.timer_started_at:
            running_task_id = task.id
            break
    
    return {
        "tasks_today": [_serialize_task(task) for task in today_tasks],
        "tasks_done": done_count,
        "tasks_total": total_today,
        "total_time_tracked": total_time_tracked,
        "running_task_id": running_task_id
    }


@router.get("/task-stats", response_model=TaskStatsResponse)
def get_task_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    by_status = {"todo": 0, "inprogress": 0, "done": 0}
    by_priority = {"high": 0, "medium": 0, "low": 0}

    for task in tasks:
        if task.status in by_status:
            by_status[task.status] += 1
        if task.priority in by_priority:
            by_priority[task.priority] += 1

    return {"by_status": by_status, "by_priority": by_priority, "total": len(tasks)}
