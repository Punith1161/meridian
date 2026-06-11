from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from sqlalchemy.orm import Session
from app.activity import log_task_activity
from app.auth import get_current_user
from app.database import get_db
from app.models import Task, User
from app.schemas import TaskResponse, TimerState
from app.serializers import serialize_task

router = APIRouter(prefix="/tasks", tags=["timer"])


@router.post("/{task_id}/timer/start", response_model=TaskResponse)
def start_timer(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    if task.timer_started_at is not None:
        return serialize_task(task)

    task.timer_started_at = datetime.utcnow()
    log_task_activity(
        db,
        task=task,
        user=current_user,
        action="timer_started",
    )
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.post("/{task_id}/timer/stop", response_model=TaskResponse)
def stop_timer(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    if task.timer_started_at:
        elapsed_seconds = int(
            (datetime.utcnow() - task.timer_started_at).total_seconds()
        )
        task.time_spent += elapsed_seconds
        task.timer_started_at = None
        log_task_activity(
            db,
            task=task,
            user=current_user,
            action="timer_stopped",
            metadata={
                "elapsed_seconds": elapsed_seconds,
                "total_spent": task.time_spent,
            },
        )

    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.get("/{task_id}/timer", response_model=TimerState)
def get_timer(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    return {
        "time_spent": serialize_task(task)["time_spent"],
        "timer_running": task.timer_started_at is not None,
    }
