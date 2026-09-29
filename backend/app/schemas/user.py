from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import time, datetime
from uuid import UUID

class UserCreate(BaseModel):
    employee_code: str
    full_name: str
    email: EmailStr
    password: str
    role: str
    department: Optional[str] = None
    reporting_to: Optional[UUID] = None
    shift_start_time: Optional[time] = time(9, 0)
    shift_end_time: Optional[time] = time(18, 0)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    employee_code: str
    full_name: str
    email: EmailStr
    role: str
    department: Optional[str] = None
    shift_start_time: Optional[time] = None
    shift_end_time: Optional[time] = None
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
