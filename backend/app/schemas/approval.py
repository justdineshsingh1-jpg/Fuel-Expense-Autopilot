from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class ApprovalAction(BaseModel):
    action: str
    comments: Optional[str] = None

class ApprovalAuditResponse(BaseModel):
    id: UUID
    trip_log_id: UUID
    approver_id: UUID
    approval_level: str
    action: str
    comments: Optional[str] = None
    approved_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
