from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.booking import Booking
from app.models.room import Room
from app.schemas.booking import BookingCreate, BookingUpdate

class BookingService:
    @staticmethod
    def get_booking_by_id(db: Session, booking_id: str) -> Booking:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with id {booking_id} not found."
            )
        return booking

    @staticmethod
    def lock_room(db: Session, room_id: str) -> Room:
        room = (
            db.query(Room)
            .filter(Room.id == room_id)
            .with_for_update()
            .first()
        )
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found."
            )
        return room

    @staticmethod
    def check_overlap(
        db: Session,
        room_id: str,
        start_time: datetime,
        end_time: datetime,
        exclude_booking_id: Optional[str] = None
    ) -> bool:
        query = db.query(Booking).filter(
            Booking.room_id == room_id,
            Booking.status == "CONFIRMED",
            Booking.start_time < end_time,
            Booking.end_time > start_time
        )

        if exclude_booking_id:
            query = query.filter(Booking.id != exclude_booking_id)

        return query.count() > 0


    @staticmethod
    def _ensure_aware(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    @staticmethod
    def create_booking(db: Session, booking_data: BookingCreate, user_id: str) -> Booking:
        import uuid
        from datetime import timedelta

        room = BookingService.lock_room(db, booking_data.room_id)
        if not room.is_active or room.status != "AVAILABLE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This room is currently {room.status.lower().replace('_', ' ')} and cannot be booked."
            )

        start_time = BookingService._ensure_aware(booking_data.start_time)
        end_time = BookingService._ensure_aware(booking_data.end_time)

        if start_time >= end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start time must be before end time."
            )

        now = datetime.now(timezone.utc)
        if start_time < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking start time must be in the future."
            )

        recurrence_pattern = booking_data.recurrence or "NONE"
        count = booking_data.recurrence_count or 1

        if recurrence_pattern == "NONE" or count <= 1:
            # Single-day booking (standard behavior)
            if BookingService.check_overlap(db, room.id, start_time, end_time):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Overlapping Booking: This room is already booked for the selected time range."
                )

            booking = Booking(
                room_id=room.id,
                user_id=user_id,
                location_id=booking_data.location_id or room.location_id,
                title=booking_data.title,
                start_time=start_time,
                end_time=end_time,
                status="CONFIRMED",
                recurrence="NONE",
                participants=booking_data.participants or []
            )
            db.add(booking)
            db.commit()
            db.refresh(booking)
            return booking

        # Recurring Booking Engine
        import calendar

        def _add_months(dt: datetime, months: int) -> datetime:
            month = dt.month - 1 + months
            year = dt.year + month // 12
            month = month % 12 + 1
            day = min(dt.day, calendar.monthrange(year, month)[1])
            return dt.replace(year=year, month=month, day=day)

        series_group_id = str(uuid.uuid4())
        occurrences = []

        for i in range(count):
            if recurrence_pattern == "DAILY":
                occ_start = start_time + timedelta(days=i)
                occ_end = end_time + timedelta(days=i)
            elif recurrence_pattern == "WEEKLY":
                occ_start = start_time + timedelta(weeks=i)
                occ_end = end_time + timedelta(weeks=i)
            elif recurrence_pattern == "MONTHLY":
                occ_start = _add_months(start_time, i)
                occ_end = _add_months(end_time, i)
            else:
                occ_start = start_time
                occ_end = end_time

            # Validate overlap for each occurrence date
            if BookingService.check_overlap(db, room.id, occ_start, occ_end):
                date_str = occ_start.strftime("%Y-%m-%d %H:%M")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Conflict on occurrence #{i + 1} ({date_str}): Room is already reserved at that time."
                )

            occurrences.append((occ_start, occ_end))

        # If all occurrence slots are free, persist series!
        first_booking = None
        for idx, (occ_start, occ_end) in enumerate(occurrences):
            bk = Booking(
                room_id=room.id,
                user_id=user_id,
                location_id=booking_data.location_id or room.location_id,
                title=f"{booking_data.title} ({idx + 1}/{count})",
                start_time=occ_start,
                end_time=occ_end,
                status="CONFIRMED",
                recurrence=recurrence_pattern,
                recurrence_group_id=series_group_id,
                participants=booking_data.participants or []
            )
            db.add(bk)
            if idx == 0:
                first_booking = bk

        db.commit()
        db.refresh(first_booking)
        return first_booking

    @staticmethod
    def get_bookings(
        db: Session,
        user_id: Optional[str] = None,
        upcoming_only: Optional[bool] = None,
        past_only: Optional[bool] = None
    ) -> List[Booking]:
        query = db.query(Booking)

        if user_id:
            query = query.filter(Booking.user_id == user_id)

        now = datetime.now(timezone.utc)
        if upcoming_only:
            query = query.filter(Booking.end_time >= now, Booking.status == "CONFIRMED")
            query = query.order_by(Booking.start_time.asc())
        elif past_only:
            query = query.filter((Booking.end_time < now) | (Booking.status == "CANCELLED"))
            query = query.order_by(Booking.start_time.desc())
        else:
            query = query.order_by(Booking.start_time.desc())

        return query.all()

    @staticmethod
    def update_booking(
        db: Session,
        booking_id: str,
        booking_data: BookingUpdate,
        user_id: str
    ) -> Booking:
        booking = BookingService.get_booking_by_id(db, booking_id)

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this booking."
            )

        if booking.status == "CANCELLED" and (
            booking_data.status is None or booking_data.status == "CANCELLED"
        ):
            # Allow only reconfirm path when status is explicitly set to CONFIRMED
            if booking_data.title is not None or booking_data.start_time is not None or booking_data.end_time is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cancelled bookings cannot be edited. Set status to CONFIRMED to reactivate."
                )

        BookingService.lock_room(db, booking.room_id)
        update_data = booking_data.model_dump(exclude_unset=True)

        start_time = BookingService._ensure_aware(update_data.get("start_time", booking.start_time))
        end_time = BookingService._ensure_aware(update_data.get("end_time", booking.end_time))

        if start_time >= end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start time must be before end time."
            )

        now = datetime.now(timezone.utc)
        times_changing = "start_time" in update_data or "end_time" in update_data
        if times_changing and start_time < now:
            if not (start_time == booking.start_time and BookingService._ensure_aware(booking.start_time) < now):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Booking time must be in the future."
                )

        resulting_status = update_data.get("status", booking.status)
        needs_overlap_check = resulting_status == "CONFIRMED" and (
            times_changing or update_data.get("status") == "CONFIRMED"
        )

        if needs_overlap_check:
            if BookingService.check_overlap(
                db,
                room_id=booking.room_id,
                start_time=start_time,
                end_time=end_time,
                exclude_booking_id=booking_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Overlapping Booking: This room is already booked for the selected time range."
                )

        for key, value in update_data.items():
            setattr(booking, key, value)

        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def cancel_booking(db: Session, booking_id: str, user_id: str) -> Booking:
        booking = BookingService.get_booking_by_id(db, booking_id)

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to cancel this booking."
            )

        if booking.status == "CANCELLED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This booking is already cancelled."
            )

        booking.status = "CANCELLED"
        db.commit()
        db.refresh(booking)
        return booking
