import asyncio
from app.database import engine, Base
# Import all models so metadata knows about them
from app.models.user import User
from app.models.trip_log import TripLog
from app.models.trip_location import TripLocation
from app.models.fuel_bill import FuelBill
from app.models.approval_log import ApprovalLog

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
