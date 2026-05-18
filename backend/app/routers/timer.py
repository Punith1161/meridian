from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task, User
from app.schemas import TaskResponse
from app.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["timer"])


@router.post("/{task_id}/timer/start", response_model=TaskResponse)
def start_timer(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    task.timer_started_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/timer/stop", response_model=TaskResponse)
def stop_timer(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task.timer_started_at:
        elapsed_seconds = int((datetime.utcnow() - task.timer_started_at).total_seconds())
        task.time_spent += elapsed_seconds
        task.timer_started_at = None
    
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}/timer", response_model=dict)
def get_timer(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    is_running = task.timer_started_at is not None
    return {"time_spent": task.time_spent, "is_running": is_running}