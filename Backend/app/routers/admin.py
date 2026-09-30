from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.room import Room
from app.models.location import Location
from app.models.booking import Booking
from app.models.audit_log import AuditLog
from app.schemas.auth import UserResponse
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse
from app.schemas.booking import BookingResponse
from app.schemas.audit_log import AuditLogResponse

router = APIRouter(prefix="/admin", tags=["admin"])

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to access this endpoint."
        )
    return current_user

def log_admin_action(db: Session, admin_email: str, action_type: str, description: str):
    log = AuditLog(
        admin_email=admin_email,
        action_type=action_type,
        description=description
    )
    db.add(log)
    db.commit()

# --- AUDIT LOGS ENDPOINT ---
@router.get("/audit-logs", response_model=List[AuditLogResponse])
def admin_get_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()

# --- USER MANAGEMENT ---
@router.get("/users", response_model=List[UserResponse])
def admin_get_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/users/{user_id}/toggle-status", response_model=UserResponse)
def admin_toggle_user_status(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own admin account.")
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    status_str = "ACTIVATED" if user.is_active else "DEACTIVATED"
    log_admin_action(db, admin.email, f"USER_{status_str}", f"User account '{user.full_name}' ({user.email}) was {status_str.lower()}.")
    return user

# --- LOCATION MANAGEMENT ---
@router.get("/locations", response_model=List[LocationResponse])
def admin_get_locations(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(Location).order_by(Location.building_name.asc(), Location.floor.asc()).all()

@router.post("/locations", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def admin_create_location(
    loc_data: LocationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    location = Location(
        building_name=loc_data.building_name.strip(),
        floor=loc_data.floor.strip(),
        block=loc_data.block.strip() if loc_data.block else None,
        city=loc_data.city.strip() if loc_data.city else "HQ",
        address=loc_data.address.strip() if loc_data.address else None,
        is_active=True
    )
    db.add(location)
    db.commit()
    db.refresh(location)

    log_admin_action(db, admin.email, "LOCATION_CREATED", f"Created location '{location.building_name} - {location.floor}'.")
    return location

@router.put("/locations/{location_id}", response_model=LocationResponse)
def admin_update_location(
    location_id: str,
    loc_data: LocationUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found.")

    update_dict = loc_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(location, key, value)

    db.commit()
    db.refresh(location)

    log_admin_action(db, admin.email, "LOCATION_UPDATED", f"Updated location '{location.building_name} - {location.floor}'.")
    return location

# --- ROOM MANAGEMENT ---
@router.get("/rooms", response_model=List[RoomResponse])
def admin_get_rooms(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(Room).order_by(Room.name.asc()).all()

@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def admin_create_room(
    room_data: RoomCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    existing = db.query(Room).filter(Room.name.ilike(room_data.name.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="A room with this name already exists.")

    room = Room(
        name=room_data.name.strip(),
        capacity=room_data.capacity,
        location_id=room_data.location_id,
        status=room_data.status or "AVAILABLE",
        features=room_data.features or [],
        description=room_data.description,
        image_url=room_data.image_url or "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600"
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    log_admin_action(db, admin.email, "ROOM_CREATED", f"Created meeting room '{room.name}' (Capacity: {room.capacity}).")
    return room

@router.put("/rooms/{room_id}", response_model=RoomResponse)
def admin_update_room(
    room_id: str,
    room_data: RoomUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    update_dict = room_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(room, key, value)

    db.commit()
    db.refresh(room)

    log_admin_action(db, admin.email, "ROOM_UPDATED", f"Updated room '{room.name}' status to '{room.status}'.")
    return room

# --- SYSTEM BOOKINGS OVERVIEW ---
@router.get("/bookings", response_model=List[BookingResponse])
def admin_get_all_bookings(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(Booking).order_by(Booking.start_time.desc()).all()

@router.put("/bookings/{booking_id}/cancel", response_model=BookingResponse)
def admin_cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    
    booking.status = "CANCELLED"
    db.commit()
    db.refresh(booking)

    log_admin_action(db, admin.email, "BOOKING_CANCELLED", f"Admin cancelled booking '{booking.title}'.")
    return booking

@router.get("/analytics")
def admin_get_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from collections import Counter
    bookings = db.query(Booking).filter(Booking.status == "CONFIRMED").all()

    if not bookings:
        return {
            "most_booked_room": "N/A",
            "most_booked_count": 0,
            "busiest_time_slot": "9:00 AM - 10:00 AM",
            "avg_duration_minutes": 0,
            "busiest_day": "Monday",
            "total_hours": 0
        }

    # 1. Most Booked Room
    room_counts = Counter(b.room_id for b in bookings if b.room_id)
    most_common_room_id, most_booked_count = room_counts.most_common(1)[0] if room_counts else (None, 0)
    most_booked_room_obj = db.query(Room).filter(Room.id == most_common_room_id).first() if most_common_room_id else None
    most_booked_room_name = most_booked_room_obj.name if most_booked_room_obj else "N/A"

    # 2. Busiest Time Slot
    hour_counts = Counter(b.start_time.hour for b in bookings)
    busiest_hour, _ = hour_counts.most_common(1)[0]
    
    start_hour_str = f"{busiest_hour % 12 or 12}:00 {'PM' if busiest_hour >= 12 else 'AM'}"
    end_hour = (busiest_hour + 1) % 24
    end_hour_str = f"{end_hour % 12 or 12}:00 {'PM' if end_hour >= 12 else 'AM'}"
    busiest_slot = f"{start_hour_str} - {end_hour_str}"

    # 3. Average Duration & Total Hours
    durations = [(b.end_time - b.start_time).total_seconds() / 60 for b in bookings]
    avg_dur = round(sum(durations) / len(durations)) if durations else 0
    total_hrs = round(sum(durations) / 60, 1)

    # 4. Busiest Day of Week
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_counts = Counter(b.start_time.weekday() for b in bookings)
    busiest_day_idx, _ = day_counts.most_common(1)[0]
    busiest_day_name = days[busiest_day_idx]

    return {
        "most_booked_room": most_booked_room_name,
        "most_booked_count": most_booked_count,
        "busiest_time_slot": busiest_slot,
        "avg_duration_minutes": avg_dur,
        "busiest_day": busiest_day_name,
        "total_hours": total_hrs
    }
