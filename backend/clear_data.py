import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def clear_test_data():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Clear all trip logs and fuel bills
        await session.execute(text("TRUNCATE TABLE trip_logs CASCADE;"))
        await session.execute(text("TRUNCATE TABLE fuel_bills CASCADE;"))
        await session.execute(text("TRUNCATE TABLE locations CASCADE;"))
        await session.commit()
        print("Successfully deleted all test trips and bills!")

if __name__ == "__main__":
    asyncio.run(clear_test_data())
