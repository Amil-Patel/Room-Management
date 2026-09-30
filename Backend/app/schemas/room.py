from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.location import LocationResponse

class RoomBase(BaseModel):
    name: str = Field(..., min_length=1)
    capacity: int = Field(..., gt=0, description="Capacity must be greater than 0")
    location_id: Optional[str] = None
    status: str = "AVAILABLE"
    features: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    image_url: Optional[str] = None

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    location_id: Optional[str] = None
    status: Optional[str] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

class RoomResponse(RoomBase):
    id: str
    is_active: bool
    location: Optional[LocationResponse] = None

    class Config:
        from_attributes = True
