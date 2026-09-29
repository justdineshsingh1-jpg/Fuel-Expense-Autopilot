from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.schemas.trip_log import TripLogCreate, TripLogResponse, TripLogListResponse
from app.models.trip_log import TripLog
from app.models.user import User
from app.auth.dependencies import get_current_user, RoleChecker
from app.services.fraud_detection_service import run_all_fraud_checks
import uuid

router = APIRouter()

@router.post("", response_model=TripLogResponse)
async def create_trip_log(
    trip_in: TripLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(["field_executive"]))
):
    db_trip = TripLog(
        user_id=current_user.id,
        log_date=trip_in.log_date,
        start_reading=trip_in.start_reading,
        end_reading=trip_in.end_reading,
        start_odometer_image_url=trip_in.start_odometer_image_url,
        end_odometer_image_url=trip_in.end_odometer_image_url,
        start_reading_ocr=trip_in.start_reading_ocr,
        end_reading_ocr=trip_in.end_reading_ocr,
        start_capture_timestamp=trip_in.start_capture_timestamp,
        end_capture_timestamp=trip_in.end_capture_timestamp,
        start_lat=trip_in.start_lat,
        start_lng=trip_in.start_lng,
        end_lat=trip_in.end_lat,
        end_lng=trip_in.end_lng,
        approval_status="draft"
    )
    db.add(db_trip)
    await db.commit()
    await db.refresh(db_trip)
    
    await run_all_fraud_checks(db_trip, current_user, db)
    return db_trip

@router.get("", response_model=TripLogListResponse)
async def list_trips(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(TripLog).where(TripLog.user_id == current_user.id).offset(skip).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()
    return {"items": items, "total": len(items), "page": skip // limit + 1, "size": limit}

@router.put("/{trip_id}/submit", response_model=TripLogResponse)
async def submit_trip(
    trip_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(TripLog).where(TripLog.id == trip_id, TripLog.user_id == current_user.id)
    result = await db.execute(stmt)
    trip = result.scalar_one_or_none()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip.approval_status = "tl_pending"
    await db.commit()
    await db.refresh(trip)
    return trip
