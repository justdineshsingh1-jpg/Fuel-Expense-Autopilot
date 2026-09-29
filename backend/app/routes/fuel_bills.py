from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from datetime import datetime

from ..database import get_db
from ..auth.dependencies import get_current_user
from ..models.user import User
from ..models.fuel_bill import FuelBill
from ..models.trip_log import TripLog
from ..schemas.fuel_bill import FuelBillCreate, FuelBillResponse

router = APIRouter()

@router.post("/{trip_id}/fuel-bills", response_model=FuelBillResponse)
async def add_fuel_bill(trip_id: uuid.UUID, bill: FuelBillCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TripLog).where(TripLog.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip log not found")
        
    new_bill = FuelBill(**bill.model_dump(), trip_log_id=trip_id)
    db.add(new_bill)
    await db.commit()
    await db.refresh(new_bill)
    return new_bill

@router.get("/{trip_id}/fuel-bills", response_model=List[FuelBillResponse])
async def list_fuel_bills(trip_id: uuid.UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FuelBill).where(FuelBill.trip_log_id == trip_id).order_by(FuelBill.created_at))
    return result.scalars().all()
