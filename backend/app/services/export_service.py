import csv
from io import StringIO
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.trip_log import TripLog
from app.models.user import User

async def generate_tally_csv(filters: dict, db: AsyncSession) -> str:
    stmt = select(TripLog).options(selectinload(TripLog.user), selectinload(TripLog.fuel_bills)).where(TripLog.approval_status == 'accounts_approved')
    result = await db.execute(stmt)
    trip_logs = result.scalars().all()
    
    output = StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Employee Code", "Employee Name", "Date", "Start KM", "End KM", 
        "Distance", "Fuel Amount", "Fuel Type", "Bill Ref"
    ])
    
    for log in trip_logs:
        fuel_amount = sum([float(fb.bill_amount) for fb in log.fuel_bills])
        fuel_types = ", ".join(list(set([fb.fuel_type for fb in log.fuel_bills])))
        
        writer.writerow([
            log.user.employee_code,
            log.user.full_name,
            log.log_date.isoformat(),
            log.start_reading,
            log.end_reading,
            log.distance_km,
            fuel_amount,
            fuel_types,
            str(log.id)
        ])
        
    return output.getvalue()

async def generate_monthly_summary(department: str, month: int, year: int, db: AsyncSession):
    # Simplified placeholder for the summary generation
    pass
