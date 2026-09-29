import hashlib
from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from app.models.trip_log import TripLog
from app.models.fraud_flag import FraudFlag
from app.models.fuel_bill import FuelBill
from app.models.user import User

async def check_continuous_reading(db: AsyncSession, user_id, log_date: date, start_reading: float):
    previous_date = log_date - timedelta(days=1)
    stmt = select(TripLog).where(TripLog.user_id == user_id, TripLog.log_date <= previous_date).order_by(desc(TripLog.log_date)).limit(1)
    result = await db.execute(stmt)
    prev_log = result.scalar_one_or_none()
    
    if prev_log and start_reading < float(prev_log.end_reading):
        return {
            "flagged": True,
            "type": "continuous_reading_break",
            "severity": "high",
            "desc": f"Start reading ({start_reading}) is less than previous day end reading ({prev_log.end_reading})."
        }
    return None

async def check_shift_time_violation(capture_timestamp: datetime, shift_start, shift_end):
    capture_time = capture_timestamp.time()
    if capture_time < shift_start or capture_time > shift_end:
        return {
            "flagged": True,
            "type": "after_shift_capture",
            "severity": "low",
            "desc": f"Odometer captured at {capture_time}, outside shift {shift_start}-{shift_end}."
        }
    return None

async def check_ocr_mismatch(manual_reading: float, ocr_reading: float, tolerance: float = 50.0):
    if ocr_reading and abs(manual_reading - ocr_reading) > tolerance:
        return {
            "flagged": True,
            "type": "ocr_reading_mismatch",
            "severity": "medium",
            "desc": f"Manual reading {manual_reading} differs from OCR {ocr_reading} by > {tolerance}."
        }
    return None

async def check_duplicate_bill(db: AsyncSession, bill_image_hash: str, user_id):
    # This is a simplified check. In production, we'd store and compare hashes.
    return None

async def run_all_fraud_checks(trip_log: TripLog, user: User, db: AsyncSession):
    flags = []
    
    # 1. Continuous reading check
    cr_check = await check_continuous_reading(db, trip_log.user_id, trip_log.log_date, float(trip_log.start_reading))
    if cr_check: flags.append(cr_check)
        
    # 2. Shift time check
    shift_check = await check_shift_time_violation(trip_log.start_capture_timestamp, user.shift_start_time, user.shift_end_time)
    if shift_check: flags.append(shift_check)
        
    # 3. OCR Mismatch
    if trip_log.start_reading_ocr:
        ocr_start = await check_ocr_mismatch(float(trip_log.start_reading), float(trip_log.start_reading_ocr))
        if ocr_start: flags.append(ocr_start)
            
    # Save flags
    for f in flags:
        flag = FraudFlag(
            trip_log_id=trip_log.id,
            flag_type=f["type"],
            severity=f["severity"],
            description=f["desc"]
        )
        db.add(flag)
    
    if flags:
        await db.commit()
