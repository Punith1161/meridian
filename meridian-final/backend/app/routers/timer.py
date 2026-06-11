from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.activity import log_task_activity
from app.auth import get_current_user
from app.database import get_db
from app.models import Task, User
from app.schemas import TaskResponse, TimerState
from app.serializers import serialize_task

router = APIRouter(prefix="/tasks", tags=["timer"])


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _stop_timer_on_task(task: Task) -> int:
    """Stop a running timer, accumulate elapsed seconds, return elapsed. Safe to call even if not running."""
    if task.timer_started_at is None:
        return 0
    elapsed = max(0, int((_now() - task.timer_started_at).total_seconds()))
    task.time_spent += elapsed
    task.timer_started_at = None
    return elapsed


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Don't start a timer on a completed task
    if task.status == "done":
        return serialize_task(task)

    if task.timer_started_at is not None:
        # Already running — return current state
        return serialize_task(task)

    task.timer_started_at = _now()
    log_task_activity(db, task=task, user=current_user, action="timer_started")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    elapsed = _stop_timer_on_task(task)
    if elapsed > 0:
        log_task_activity(
            db,
            task=task,
            user=current_user,
            action="timer_stopped",
            metadata={"elapsed_seconds": elapsed, "total_spent": task.time_spent},
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return {
        "time_spent": serialize_task(task)["time_spent"],
        "timer_running": task.timer_started_at is not None,
    }
