from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Sheet, User
from app.schemas import SheetCreate, SheetResponse, SheetUpdate

router = APIRouter(prefix="/sheets", tags=["sheets"])


@router.get("", response_model=list[SheetResponse])
def list_sheets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Sheet)
        .filter(Sheet.user_id == current_user.id)
        .order_by(Sheet.updated_at.desc())
        .all()
    )


@router.post("", response_model=SheetResponse, status_code=status.HTTP_201_CREATED)
def create_sheet(
    payload: SheetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sheet = Sheet(
        user_id=current_user.id,
        name=payload.name,
        data=payload.data or {"cols": [], "rows": []},
    )
    db.add(sheet)
    db.commit()
    db.refresh(sheet)
    return sheet


@router.get("/{sheet_id}", response_model=SheetResponse)
def get_sheet(
    sheet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id, Sheet.user_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    return sheet


@router.put("/{sheet_id}", response_model=SheetResponse)
def update_sheet(
    sheet_id: int,
    payload: SheetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id, Sheet.user_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(sheet, field, val)
    db.commit()
    db.refresh(sheet)
    return sheet


@router.delete("/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sheet(
    sheet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id, Sheet.user_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    db.delete(sheet)
    db.commit()
