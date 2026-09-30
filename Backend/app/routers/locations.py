from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.location import Location
from app.schemas.location import LocationResponse

router = APIRouter(prefix="/locations", tags=["locations"])

@router.get("", response_model=List[LocationResponse])
def get_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Location).order_by(Location.building_name.asc(), Location.floor.asc()).all()
