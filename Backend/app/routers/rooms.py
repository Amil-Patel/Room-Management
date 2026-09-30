from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.room import RoomResponse
from app.services.room_service import RoomService

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.get("", response_model=List[RoomResponse])
def get_rooms(
    min_capacity: Optional[int] = Query(None, description="Minimum capacity required"),
    building_name: Optional[str] = Query(None, description="Filter by building name"),
    floor: Optional[str] = Query(None, description="Filter by floor designation"),
    features: Optional[List[str]] = Query(None, description="List of required features"),
    start_time: Optional[datetime] = Query(None, description="Selected date start time for availability check"),
    end_time: Optional[datetime] = Query(None, description="Selected date end time for availability check"),
    search: Optional[str] = Query(None, description="Search by room name, location, or description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return RoomService.get_rooms(
        db=db,
        include_inactive=False,
        min_capacity=min_capacity,
        building_name=building_name,
        floor=floor,
        features=features,
        start_time=start_time,
        end_time=end_time,
        search=search,
    )

@router.get("/{room_id}", response_model=RoomResponse)
def get_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return RoomService.get_room_by_id(db, room_id)
