from datetime import datetime
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: str
    admin_email: str
    action_type: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True
