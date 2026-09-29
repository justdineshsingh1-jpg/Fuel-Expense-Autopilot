from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class FuelBillCreate(BaseModel):
    bill_image_url: str
    bill_amount: float
    fuel_type: str = "petrol"
    liters: Optional[float] = None
    ocr_detected_amount: Optional[float] = None
    pump_name: Optional[str] = None
    capture_lat: Optional[float] = None
    capture_lng: Optional[float] = None
    capture_timestamp: datetime
    remarks: Optional[str] = None

class FuelBillResponse(BaseModel):
    id: UUID
    trip_log_id: UUID
    bill_image_url: str
    bill_amount: float
    fuel_type: str
    liters: Optional[float] = None
    pump_name: Optional[str] = None
    capture_timestamp: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
