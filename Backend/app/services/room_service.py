from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.room import Room
from app.models.location import Location
from app.models.booking import Booking

class RoomService:
    @staticmethod
    def get_room_by_id(db: Session, room_id: str) -> Room:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with id {room_id} not found."
            )
        return room

    @staticmethod
    def get_rooms(
        db: Session,
        include_inactive: bool = False,
        min_capacity: Optional[int] = None,
        building_name: Optional[str] = None,
        floor: Optional[str] = None,
        features: Optional[List[str]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        search: Optional[str] = None,
    ) -> List[Room]:
        query = db.query(Room).outerjoin(Location)

        if not include_inactive:
            query = query.filter(Room.is_active == True, Room.status == "AVAILABLE")

        if min_capacity is not None:
            query = query.filter(Room.capacity >= int(min_capacity))

        if building_name:
            query = query.filter(Location.building_name.ilike(f"%{building_name.strip()}%"))

        if floor:
            query = query.filter(Location.floor.ilike(f"%{floor.strip()}%"))

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                (Room.name.ilike(term)) | (Room.description.ilike(term)) | (Location.building_name.ilike(term)) | (Location.floor.ilike(term))
            )

        if features:
            for feature in features:
                query = query.filter(Room.features.contains([feature]))

        if start_time is not None or end_time is not None:
            if start_time is None or end_time is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Both start_time and end_time are required for availability search."
                )
            if start_time >= end_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="start_time must be before end_time."
                )
            overlapping_room_ids = db.query(Booking.room_id).filter(
                Booking.status == "CONFIRMED",
                Booking.start_time < end_time,
                Booking.end_time > start_time
            ).subquery()

            query = query.filter(Room.id.not_in(overlapping_room_ids))

        if min_capacity is not None:
            return query.order_by(Room.capacity.asc(), Room.name.asc()).all()
        return query.order_by(Room.name).all()
