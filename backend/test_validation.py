import asyncio
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from datetime import time

class UserResponse(BaseModel):
    id: str
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

class MockUser:
    def __init__(self):
        self.id = str(uuid4())
        self.employee_code = "EMP001"
        self.full_name = "Admin"
        self.email = "admin@dhanpurna.net"
        self.role = "managing_director"
        self.department = "Executive"
        self.shift_start_time = None
        self.shift_end_time = None
        self.is_active = True
        self.created_at = None # simulated unloaded

user = MockUser()
try:
    resp = TokenResponse(access_token="123", user=user)
    print("Success:", resp)
except Exception as e:
    print("Error:", e)
