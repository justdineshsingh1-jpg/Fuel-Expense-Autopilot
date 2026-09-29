from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

class TripLogCreate(BaseModel):
    log_date: date
    start_reading: float
    end_reading: float
    start_odometer_image_url: str
    end_odometer_image_url: str
    start_reading_ocr: Optional[float] = None
    end_reading_ocr: Optional[float] = None
    start_capture_timestamp: datetime
    end_capture_timestamp: datetime
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None

class TripLogSubmit(BaseModel):
    trip_log_id: UUID

class TripLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    log_date: date
    start_reading: float
    end_reading: float
    distance_km: Optional[float] = None
    start_odometer_image_url: str
    end_odometer_image_url: str
    osrm_calculated_km: Optional[float] = None
    variance_percent: Optional[float] = None
    approval_status: str
    submitted_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TripLogListResponse(BaseModel):
    items: List[TripLogResponse]
    total: int
    page: int
    size: int
