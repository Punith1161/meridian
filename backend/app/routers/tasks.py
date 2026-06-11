from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timezone

from app.activity import log_task_activity
from app.auth import get_current_user
from app.database import get_db
from app.models import Task, User
from app.schemas import (
    TaskCreate,
    TaskReorderInput,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.serializers import serialize_task

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _auto_stop_timer(task: Task) -> int:
    """If the task has a running timer, stop it and accumulate time. Returns elapsed seconds."""
    if task.timer_started_at is None:
        return 0
    elapsed = max(0, int((_now() - task.timer_started_at).total_seconds()))
    task.time_spent += elapsed
    task.timer_started_at = None
    return elapsed


@router.get("", response_model=list[TaskResponse])
def get_tasks(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.status.asc(), Task.position.asc(), Task.created_at.desc())
        .all()
    )
    return [serialize_task(task) for task in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    max_position = (
        db.query(func.max(Task.position))
        .filter(and_(Task.user_id == current_user.id, Task.status == task.status.value))
        .scalar()
    )
    next_position = 0 if max_position is None else max_position + 1

    db_task = Task(
        user_id=current_user.id,
        title=task.title,
        priority=task.priority.value,
        status=task.status.value,
        due_date=task.due_date,
        time_estimate=task.time_estimate,
        position=next_position,
    )
    db.add(db_task)
    db.flush()
    log_task_activity(
        db,
        task=db_task,
        user=current_user,
        action="created",
        to_value=db_task.status,
        metadata={"priority": db_task.priority, "time_estimate": db_task.time_estimate},
    )
    db.commit()
    db.refresh(db_task)
    return serialize_task(db_task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
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
    return serialize_task(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
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

    update_data = task_update.model_dump(exclude_unset=True)
    if "priority" in update_data and update_data["priority"] is not None:
        update_data["priority"] = update_data["priority"].value

    changes: list[str] = []
    for field, value in update_data.items():
        old = getattr(task, field)
        if old != value:
            changes.append(f"{field}: {old} -> {value}")
        setattr(task, field, value)

    if changes:
        log_task_activity(db, task=task, user=current_user, action="updated", metadata=", ".join(changes))

    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    status_update: TaskStatusUpdate,
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

    previous = task.status
    new_status = status_update.status.value

    # ── Auto-stop timer when task is moved to "done" ──────────────────────────
    if new_status == "done" and task.timer_started_at is not None:
        elapsed = _auto_stop_timer(task)
        if elapsed > 0:
            log_task_activity(
                db,
                task=task,
                user=current_user,
                action="timer_stopped",
                metadata={"elapsed_seconds": elapsed, "total_spent": task.time_spent, "reason": "task_completed"},
            )

    task.status = new_status
    if previous != task.status:
        max_position = (
            db.query(func.max(Task.position))
            .filter(and_(Task.user_id == current_user.id, Task.status == task.status))
            .scalar()
        )
        task.position = 0 if max_position is None else max_position + 1
        log_task_activity(
            db,
            task=task,
            user=current_user,
            action="status_changed",
            from_value=previous,
            to_value=task.status,
        )

    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.post("/reorder", response_model=list[TaskResponse])
def reorder_tasks(
    payload: TaskReorderInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = payload.items
    if not items:
        return []

    task_ids = [item.task_id for item in items]
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id, Task.id.in_(task_ids))
        .all()
    )
    by_id = {task.id: task for task in tasks}

    if len(by_id) != len(task_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Some tasks were not found")

    for item in items:
        task = by_id[item.task_id]
        old_status = task.status
        new_status = item.status.value

        # ── Auto-stop timer if dragged into "done" column ─────────────────────
        if new_status == "done" and task.timer_started_at is not None:
            elapsed = _auto_stop_timer(task)
            if elapsed > 0:
                log_task_activity(
                    db, task=task, user=current_user, action="timer_stopped",
                    metadata={"elapsed_seconds": elapsed, "total_spent": task.time_spent, "reason": "task_completed"},
                )

        task.position = item.position
        task.status = new_status
        if old_status != task.status:
            log_task_activity(
                db, task=task, user=current_user, action="status_changed",
                from_value=old_status, to_value=task.status, metadata="drag-and-drop",
            )

    db.commit()

    updated = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.status.asc(), Task.position.asc(), Task.created_at.desc())
        .all()
    )
    return [serialize_task(task) for task in updated]


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
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

    log_task_activity(db, task=task, user=current_user, action="deleted", from_value=task.status)
    db.delete(task)
    db.commit()
