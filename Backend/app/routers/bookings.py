from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingResponse, BookingUpdate
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BookingService.create_booking(db, booking_data, current_user.id)

@router.get("", response_model=List[BookingResponse])
def get_bookings(
    upcoming_only: Optional[bool] = Query(None, description="Filter only upcoming bookings"),
    past_only: Optional[bool] = Query(None, description="Filter only past/cancelled bookings"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BookingService.get_bookings(
        db=db,
        user_id=current_user.id,
        upcoming_only=upcoming_only,
        past_only=past_only
    )


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = BookingService.get_booking_by_id(db, booking_id)
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this booking."
        )
    return booking


@router.put("/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: str,
    booking_data: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BookingService.update_booking(
        db=db,
        booking_id=booking_id,
        booking_data=booking_data,
        user_id=current_user.id
    )

@router.delete("/{booking_id}", response_model=BookingResponse)
def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return BookingService.cancel_booking(
        db=db,
        booking_id=booking_id,
        user_id=current_user.id
    )

