from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class FraudFlagExplanation(BaseModel):
    explanation: str

class FraudFlagResponse(BaseModel):
    id: UUID
    trip_log_id: UUID
    flag_type: str
    severity: str
    description: str
    auto_detected: bool
    executive_explanation: Optional[str] = None
    resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
