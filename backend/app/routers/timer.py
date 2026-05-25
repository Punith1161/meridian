from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task, TaskActivity, User
from app.schemas import TaskResponse, TimerStateResponse
from app.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["timer"])


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


def _log_activity(
    db: Session,
    *,
    user_id: int,
    task_id: int,
    task_title: str,
    action: str,
    metadata: str | None = None,
) -> None:
    db.add(
        TaskActivity(
            user_id=user_id,
            task_id=task_id,
            task_title=task_title,
            action=action,
            meta=metadata,
        )
    )


@router.post("/{task_id}/timer/start", response_model=TaskResponse)
def start_timer(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task.timer_started_at:
        return _serialize_task(task)

    task.timer_started_at = datetime.utcnow()
    _log_activity(
        db,
        user_id=current_user.id,
        task_id=task.id,
        task_title=task.title,
        action="timer_started",
    )
    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.post("/{task_id}/timer/stop", response_model=TaskResponse)
def stop_timer(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task.timer_started_at:
        elapsed_seconds = int((datetime.utcnow() - task.timer_started_at).total_seconds())
        task.time_spent += elapsed_seconds
        task.timer_started_at = None
        _log_activity(
            db,
            user_id=current_user.id,
            task_id=task.id,
            task_title=task.title,
            action="timer_stopped",
            metadata=f'{{"elapsed_seconds": {elapsed_seconds}, "total_spent": {task.time_spent}}}',
        )
    
    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.get("/{task_id}/timer", response_model=TimerStateResponse)
def get_timer(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    time_spent = task.time_spent
    timer_running = task.timer_started_at is not None
    if timer_running:
        time_spent += int((datetime.utcnow() - task.timer_started_at).total_seconds())

    return {"time_spent": time_spent, "timer_running": timer_running}