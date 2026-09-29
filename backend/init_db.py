import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.database import Base
from app.models.user import User
from app.models.trip_log import TripLog
from app.models.trip_location import TripLocation
from app.models.fuel_bill import FuelBill
from app.models.approval_log import ApprovalLog

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def init_db():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created!")

if __name__ == "__main__":
    asyncio.run(init_db())
