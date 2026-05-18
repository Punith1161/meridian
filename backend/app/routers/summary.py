from fastapi import APIRouter, Depends
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Task, User
from app.auth import get_current_user

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/today", response_model=dict)
def get_today_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    
    all_tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    today_tasks = [t for t in all_tasks if t.due_date == today]
    
    total_time_tracked = sum(t.time_spent for t in all_tasks)
    
    done_count = sum(1 for t in today_tasks if t.status == "done")
    total_today = len(today_tasks)
    
    running_task_id = None
    for task in all_tasks:
        if task.timer_started_at:
            running_task_id = task.id
            break
    
    return {
        "tasks_today": total_today,
        "completed": done_count,
        "total_time_tracked": total_time_tracked,
        "running_task_id": running_task_id
    }
