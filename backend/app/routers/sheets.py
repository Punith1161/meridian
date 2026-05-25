from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Sheet, User
from app.schemas import SheetCreate, SheetUpdate, SheetResponse
from app.auth import get_current_user

router = APIRouter(prefix="/sheets", tags=["sheets"])


@router.get("", response_model=list[SheetResponse])
def get_sheets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sheets = db.query(Sheet).filter(Sheet.user_id == current_user.id).all()
    return sheets


@router.post("", response_model=SheetResponse, status_code=status.HTTP_201_CREATED)
def create_sheet(sheet: SheetCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    default_data = {
        "cols": ["A", "B", "C", "D", "E", "F", "G", "H"],
        "rows": [["" for _ in range(8)] for _ in range(20)],
        "formats": {},
    }
    db_sheet = Sheet(
        user_id=current_user.id,
        name=sheet.name,
        data=sheet.data if sheet.data else default_data
    )
    db.add(db_sheet)
    db.commit()
    db.refresh(db_sheet)
    return db_sheet


@router.get("/{sheet_id}", response_model=SheetResponse)
def get_sheet(sheet_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id, Sheet.user_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sheet not found")
    return sheet


@router.put("/{sheet_id}", response_model=SheetResponse)
def update_sheet(sheet_id: int, sheet_update: SheetUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id, Sheet.user_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sheet not found")
    
    update_data = sheet_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sheet, field, value)
    
    db.commit()
    db.refresh(sheet)
    return sheet


@router.delete("/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sheet(sheet_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sheet = db.query(Sheet).filter(Sheet.id == sheet_id, Sheet.user_id == current_user.id).first()
    if not sheet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sheet not found")
    
    db.delete(sheet)
    db.commit()
