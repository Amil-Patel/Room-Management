import uuid
from sqlalchemy import Boolean, Column, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    location_id = Column(String(36), ForeignKey("locations.id"), nullable=True)
    status = Column(String(50), default="AVAILABLE", nullable=False)  # "AVAILABLE", "UNDER_MAINTENANCE", "CURRENTLY_UNAVAILABLE"
    features = Column(JSON, default=list, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)

    location = relationship("Location", back_populates="rooms")
