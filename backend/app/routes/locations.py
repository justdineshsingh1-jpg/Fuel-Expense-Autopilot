from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from datetime import datetime

from ..database import get_db
from ..auth.dependencies import get_current_user
from ..models.user import User
from ..models.trip_location import TripLocation
from ..models.trip_log import TripLog
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()

class LocationCreate(BaseModel):
    sequence_order: int
    client_name: str
    visit_purpose: Optional[str] = None
    latitude: float
    longitude: float
    address_text: Optional[str] = None
    arrival_timestamp: datetime
    departure_timestamp: Optional[datetime] = None

class LocationResponse(LocationCreate):
    id: uuid.UUID
    trip_log_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/{trip_id}/locations", response_model=LocationResponse)
async def add_location(trip_id: uuid.UUID, location: LocationCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify trip exists and belongs to user
    result = await db.execute(select(TripLog).where(TripLog.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip log not found")
        
    new_loc = TripLocation(**location.model_dump(), trip_log_id=trip_id)
    db.add(new_loc)
    await db.commit()
    await db.refresh(new_loc)
    return new_loc

@router.get("/{trip_id}/locations", response_model=List[LocationResponse])
async def list_locations(trip_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TripLocation).where(TripLocation.trip_log_id == trip_id).order_by(TripLocation.sequence_order))
    return result.scalars().all()
