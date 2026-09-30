from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, model_validator
from app.schemas.room import RoomResponse
from app.schemas.auth import UserResponse
from app.schemas.location import LocationResponse

BookingStatus = Literal["CONFIRMED", "CANCELLED"]
RecurrencePattern = Literal["NONE", "DAILY", "WEEKLY", "MONTHLY"]

class BookingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    start_time: datetime
    end_time: datetime

class BookingCreate(BookingBase):
    room_id: str
    location_id: Optional[str] = None
    recurrence: Optional[RecurrencePattern] = "NONE"
    recurrence_count: Optional[int] = Field(default=1, ge=1, le=12)
    participants: Optional[List[str]] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_times(self) -> "BookingCreate":
        if self.start_time >= self.end_time:
            raise ValueError("Start time must be before end time")
        return self

class BookingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[BookingStatus] = None
    participants: Optional[List[str]] = None

class BookingResponse(BookingBase):
    id: str
    room_id: str
    user_id: str
    location_id: Optional[str] = None
    status: str
    recurrence: Optional[str] = "NONE"
    recurrence_group_id: Optional[str] = None
    participants: Optional[List[str]] = Field(default_factory=list)
    created_at: datetime
    room: Optional[RoomResponse] = None
    user: Optional[UserResponse] = None
    location: Optional[LocationResponse] = None

    class Config:
        from_attributes = True
