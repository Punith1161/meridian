from datetime import date, datetime, timedelta, timezone
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.auth import get_current_user
from app.database import get_db
from app.models import Habit, HabitEntry, User
from app.schemas import (
    HabitCreate, HabitUpdate, HabitResponse,
    HabitEntryToggle, HabitEntryResponse,
    HabitStats, HabitWithStats,
)

router = APIRouter(prefix="/habits", tags=["habits"])


# ─── Streak + stats helpers ───────────────────────────────────────────────────

def _should_do_on(habit: Habit, d: date) -> bool:
    """Return True if the habit is expected on this day of the week."""
    dow = d.weekday()  # Mon=0 … Sun=6
    if habit.frequency == "daily":
        return True
    if habit.frequency == "weekdays":
        return dow < 5
    if habit.frequency == "weekends":
        return dow >= 5
    if habit.frequency == "custom" and habit.frequency_days:
        # stored as Python weekday list Mon=0…Sun=6
        return dow in habit.frequency_days
    return True


def _compute_stats(habit: Habit, entries: list[HabitEntry]) -> HabitStats:
    today = date.today()
    done_dates: set[date] = {e.date for e in entries if e.count >= habit.target_count}
    entry_counts: dict[date, int] = {e.date: e.count for e in entries}

    # ── Current streak ────────────────────────────────────────────────────────
    current_streak = 0
    check = today
    while True:
        if not _should_do_on(habit, check):
            check -= timedelta(days=1)
            continue
        if check in done_dates:
            current_streak += 1
            check -= timedelta(days=1)
        else:
            # If today isn't done yet, don't break the streak immediately
            if check == today:
                check -= timedelta(days=1)
                continue
            break
        if check < today - timedelta(days=730):
            break

    # ── Longest streak ────────────────────────────────────────────────────────
    longest_streak = 0
    running = 0
    for i in range(365 * 2):
        day = today - timedelta(days=i)
        if not _should_do_on(habit, day):
            continue
        if day in done_dates:
            running += 1
            longest_streak = max(longest_streak, running)
        else:
            running = 0

    # ── 30-day completion rate ────────────────────────────────────────────────
    expected_30 = sum(1 for i in range(30) if _should_do_on(habit, today - timedelta(days=i)))
    done_30 = sum(1 for i in range(30) if (today - timedelta(days=i)) in done_dates)
    completion_rate = done_30 / expected_30 if expected_30 > 0 else 0.0

    # ── Last 365 days heatmap ─────────────────────────────────────────────────
    entries_last_365: dict[str, int] = {}
    cutoff = today - timedelta(days=364)
    for e in entries:
        if e.date >= cutoff:
            entries_last_365[e.date.isoformat()] = e.count

    return HabitStats(
        habit_id=habit.id,
        current_streak=current_streak,
        longest_streak=longest_streak,
        completion_rate_30d=round(completion_rate, 3),
        total_completions=len(done_dates),
        entries_last_365=entries_last_365,
    )


# ─── Habit CRUD ───────────────────────────────────────────────────────────────

@router.get("", response_model=list[HabitResponse])
def list_habits(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Habit).filter(Habit.user_id == current_user.id)
    if not include_archived:
        q = q.filter(Habit.archived == False)
    return q.order_by(Habit.position.asc(), Habit.created_at.asc()).all()


@router.post("", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
def create_habit(
    payload: HabitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = Habit(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        color=payload.color,
        icon=payload.icon,
        frequency=payload.frequency,
        frequency_days=payload.frequency_days,
        target_count=max(1, payload.target_count),
        position=payload.position,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.get("/with-stats", response_model=list[HabitWithStats])
def list_habits_with_stats(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all habits with pre-computed streaks, rates and heatmap data."""
    q = db.query(Habit).filter(Habit.user_id == current_user.id)
    if not include_archived:
        q = q.filter(Habit.archived == False)
    habits = q.order_by(Habit.position.asc(), Habit.created_at.asc()).all()

    today = date.today()
    result = []
    for habit in habits:
        entries = (
            db.query(HabitEntry)
            .filter(HabitEntry.habit_id == habit.id)
            .all()
        )
        stats = _compute_stats(habit, entries)
        today_entry = next((e for e in entries if e.date == today), None)
        result.append(HabitWithStats(
            habit=habit,
            stats=stats,
            today_entry=HabitEntryResponse(
                id=today_entry.id,
                habit_id=today_entry.habit_id,
                date=today_entry.date,
                count=today_entry.count,
                created_at=today_entry.created_at,
            ) if today_entry else None,
        ))
    return result


@router.get("/{habit_id}", response_model=HabitResponse)
def get_habit(
    habit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit


@router.put("/{habit_id}", response_model=HabitResponse)
def update_habit(
    habit_id: int,
    payload: HabitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(habit, field, val)
    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(
    habit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    db.delete(habit)
    db.commit()


@router.post("/reorder", response_model=list[HabitResponse])
def reorder_habits(
    items: list[dict],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for item in items:
        habit = db.query(Habit).filter(
            Habit.id == item["habit_id"], Habit.user_id == current_user.id
        ).first()
        if habit:
            habit.position = item["position"]
    db.commit()
    return db.query(Habit).filter(
        Habit.user_id == current_user.id, Habit.archived == False
    ).order_by(Habit.position.asc()).all()


# ─── Entry toggle ─────────────────────────────────────────────────────────────

@router.post("/{habit_id}/toggle", response_model=HabitEntryResponse | None)
def toggle_entry(
    habit_id: int,
    payload: HabitEntryToggle,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle a habit entry for a given date. If entry exists, delete it (undo). Otherwise create it."""
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    existing = db.query(HabitEntry).filter(
        and_(HabitEntry.habit_id == habit_id, HabitEntry.date == payload.date)
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return None   # toggled OFF — return null to signal deletion
    else:
        entry = HabitEntry(
            habit_id=habit_id,
            user_id=current_user.id,
            date=payload.date,
            count=max(1, payload.count),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry


@router.get("/{habit_id}/entries", response_model=list[HabitEntryResponse])
def list_entries(
    habit_id: int,
    days: int = 365,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    cutoff = date.today() - timedelta(days=days)
    return (
        db.query(HabitEntry)
        .filter(HabitEntry.habit_id == habit_id, HabitEntry.date >= cutoff)
        .order_by(HabitEntry.date.desc())
        .all()
    )


@router.get("/{habit_id}/stats", response_model=HabitStats)
def get_stats(
    habit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    entries = db.query(HabitEntry).filter(HabitEntry.habit_id == habit_id).all()
    return _compute_stats(habit, entries)
