from typing import Optional
from pydantic import BaseModel, Field

class LocationBase(BaseModel):
    building_name: str = Field(..., min_length=1)
    floor: str = Field(..., min_length=1)
    block: Optional[str] = None
    city: Optional[str] = "HQ"
    address: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    building_name: Optional[str] = None
    floor: Optional[str] = None
    block: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class LocationResponse(LocationBase):
    id: str
    is_active: bool

    class Config:
        from_attributes = True
