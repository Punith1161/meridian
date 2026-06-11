from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Note, Notebook, User
from app.schemas import (
    NoteCreate, NoteUpdate, NoteResponse,
    NoteCreateV2, NoteUpdateV2, NoteResponseV2,
    NotebookCreate, NotebookUpdate, NotebookResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])


# ─── Helper: build NoteResponseV2 from ORM object ────────────────────────────

def _serialize_note(note: Note) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "notebook_id": note.notebook_id,
        "pinned": note.pinned if note.pinned is not None else False,
        "tags": note.tags if note.tags is not None else [],
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


# ─── Notebooks ────────────────────────────────────────────────────────────────

@router.get("/notebooks", response_model=list[NotebookResponse])
def list_notebooks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notebooks = (
        db.query(Notebook)
        .filter(Notebook.user_id == current_user.id)
        .order_by(Notebook.position.asc(), Notebook.created_at.asc())
        .all()
    )
    result = []
    for nb in notebooks:
        count = db.query(Note).filter(Note.notebook_id == nb.id).count()
        result.append({
            "id": nb.id,
            "name": nb.name,
            "color": nb.color,
            "position": nb.position,
            "note_count": count,
            "created_at": nb.created_at,
            "updated_at": nb.updated_at,
        })
    return result


@router.post("/notebooks", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
def create_notebook(
    payload: NotebookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    nb = Notebook(
        user_id=current_user.id,
        name=payload.name,
        color=payload.color,
        position=payload.position,
    )
    db.add(nb)
    db.commit()
    db.refresh(nb)
    return {"id": nb.id, "name": nb.name, "color": nb.color,
            "position": nb.position, "note_count": 0,
            "created_at": nb.created_at, "updated_at": nb.updated_at}


@router.put("/notebooks/{notebook_id}", response_model=NotebookResponse)
def update_notebook(
    notebook_id: int,
    payload: NotebookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id, Notebook.user_id == current_user.id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(nb, field, val)
    db.commit()
    db.refresh(nb)
    count = db.query(Note).filter(Note.notebook_id == nb.id).count()
    return {"id": nb.id, "name": nb.name, "color": nb.color,
            "position": nb.position, "note_count": count,
            "created_at": nb.created_at, "updated_at": nb.updated_at}


@router.delete("/notebooks/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(
    notebook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id, Notebook.user_id == current_user.id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    # Unassign notes from this notebook
    db.query(Note).filter(Note.notebook_id == notebook_id).update({"notebook_id": None})
    db.delete(nb)
    db.commit()


# ─── Notes (V2 — includes notebook_id, pinned, tags) ─────────────────────────

@router.get("", response_model=list[NoteResponseV2])
def get_notes(
    notebook_id: int | None = Query(None),
    search: str | None = Query(None),
    pinned_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Note).filter(Note.user_id == current_user.id)

    if notebook_id is not None:
        q = q.filter(Note.notebook_id == notebook_id)

    if pinned_only:
        q = q.filter(Note.pinned == True)

    if search:
        term = f"%{search}%"
        q = q.filter(or_(Note.title.ilike(term), Note.content.ilike(term)))

    notes = q.order_by(Note.pinned.desc(), Note.updated_at.desc()).all()
    return [_serialize_note(n) for n in notes]


@router.post("", response_model=NoteResponseV2, status_code=status.HTTP_201_CREATED)
def create_note(
    note: NoteCreateV2,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_note = Note(
        user_id=current_user.id,
        title=note.title,
        content=note.content,
        notebook_id=note.notebook_id,
        pinned=note.pinned,
        tags=note.tags,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return _serialize_note(db_note)


@router.get("/{note_id}", response_model=NoteResponseV2)
def get_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return _serialize_note(note)


@router.put("/{note_id}", response_model=NoteResponseV2)
def update_note(
    note_id: int,
    note_update: NoteUpdateV2,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    for field, value in note_update.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return _serialize_note(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
