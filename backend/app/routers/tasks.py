import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Task, TaskActivity, User
from app.schemas import TaskCreate, TaskReorderInput, TaskUpdate, TaskStatusUpdate, TaskResponse
from app.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


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
    from_value: str | None = None,
    to_value: str | None = None,
    metadata: str | None = None,
) -> None:
    db.add(
        TaskActivity(
            user_id=user_id,
            task_id=task_id,
            task_title=task_title,
            action=action,
            from_value=from_value,
            to_value=to_value,
            meta=metadata,
        )
    )


@router.get("", response_model=list[TaskResponse])
def get_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.status.asc(), Task.position.asc(), Task.created_at.desc())
        .all()
    )
    return [_serialize_task(task) for task in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    max_position = (
        db.query(func.max(Task.position))
        .filter(Task.user_id == current_user.id, Task.status == task.status)
        .scalar()
    )
    next_position = (max_position + 1) if max_position is not None else 0

    db_task = Task(user_id=current_user.id, position=next_position, **task.dict())
    db.add(db_task)
    db.flush()

    _log_activity(
        db,
        user_id=current_user.id,
        task_id=db_task.id,
        task_title=db_task.title,
        action="created",
        to_value=db_task.status,
        metadata=json.dumps({"priority": db_task.priority, "time_estimate": db_task.time_estimate}),
    )
    db.commit()
    db.refresh(db_task)
    return _serialize_task(db_task)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _serialize_task(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    changes: list[str] = []
    for field, value in update_data.items():
        old_value = getattr(task, field)
        if old_value != value and field in ("title", "priority"):
            changes.append(f"{field}: {old_value} -> {value}")
        setattr(task, field, value)

    if changes:
        _log_activity(
            db,
            user_id=current_user.id,
            task_id=task.id,
            task_title=task.title,
            action="updated",
            metadata=", ".join(changes),
        )
    
    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status(task_id: int, status_update: TaskStatusUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    old_status = task.status
    if old_status != status_update.status:
        max_position = (
            db.query(func.max(Task.position))
            .filter(Task.user_id == current_user.id, Task.status == status_update.status)
            .scalar()
        )
        task.position = (max_position + 1) if max_position is not None else 0
    task.status = status_update.status

    if old_status != status_update.status:
        _log_activity(
            db,
            user_id=current_user.id,
            task_id=task.id,
            task_title=task.title,
            action="status_changed",
            from_value=old_status,
            to_value=status_update.status,
        )

    db.commit()
    db.refresh(task)
    return _serialize_task(task)


@router.post("/reorder", response_model=list[TaskResponse])
def reorder_tasks(payload: TaskReorderInput, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    updated_tasks: list[dict] = []

    for item in payload.items:
        task = db.query(Task).filter(Task.id == item.task_id, Task.user_id == current_user.id).first()
        if not task:
            continue

        old_status = task.status
        task.position = item.position
        task.status = item.status

        if old_status != item.status:
            _log_activity(
                db,
                user_id=current_user.id,
                task_id=task.id,
                task_title=task.title,
                action="status_changed",
                from_value=old_status,
                to_value=item.status,
                metadata="via drag-and-drop",
            )

        updated_tasks.append(_serialize_task(task))

    db.commit()
    return updated_tasks


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    _log_activity(
        db,
        user_id=current_user.id,
        task_id=task.id,
        task_title=task.title,
        action="deleted",
        from_value=task.status,
        metadata=json.dumps({"time_spent": task.time_spent}),
    )

    db.delete(task)
    db.commit()