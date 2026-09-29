import asyncio
from app.database import engine, Base
from app.models.user import User
from app.models.trip_log import TripLog
from app.models.trip_location import TripLocation
from app.models.fuel_bill import FuelBill
from app.models.approval import Approval
from app.models.fraud_flag import FraudFlag
from app.models.monthly_summary import MonthlySummary

print("Tables to create:", Base.metadata.tables.keys())

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created!")

if __name__ == "__main__":
    asyncio.run(init_db())
