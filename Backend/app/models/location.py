import uuid
from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    building_name = Column(String(255), nullable=False, index=True)
    floor = Column(String(100), nullable=False)
    block = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True, default="HQ")
    address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    rooms = relationship("Room", back_populates="location")
