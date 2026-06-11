from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import CalendarEvent, User
from app.schemas import CalendarEventCreate, CalendarEventResponse, CalendarEventUpdate
from app.serializers import serialize_calendar_event

router = APIRouter(prefix="/calendar/events", tags=["calendar"])


@router.get("", response_model=list[CalendarEventResponse])
def list_calendar_events(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    events = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.user_id == current_user.id)
        .order_by(CalendarEvent.start_at.asc(), CalendarEvent.created_at.desc())
        .all()
    )
    return [serialize_calendar_event(event) for event in events]


@router.post("", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
def create_calendar_event(
    payload: CalendarEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.end_at <= payload.start_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event end must be after start")

    event = CalendarEvent(
        user_id=current_user.id,
        title=payload.title,
        start_at=payload.start_at,
        end_at=payload.end_at,
        all_day=payload.all_day,
        location=payload.location,
        description=payload.description,
        color=payload.color,
        recurrence=payload.recurrence,
        reminder_minutes=payload.reminder_minutes,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return serialize_calendar_event(event)


@router.get("/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return serialize_calendar_event(event)


@router.put("/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: int,
    payload: CalendarEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    updates = payload.model_dump(exclude_unset=True)
    start_at = updates.get("start_at", event.start_at)
    end_at = updates.get("end_at", event.end_at)
    if start_at is not None and end_at is not None and end_at <= start_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event end must be after start")

    for field, value in updates.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return serialize_calendar_event(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    db.delete(event)
    db.commit()