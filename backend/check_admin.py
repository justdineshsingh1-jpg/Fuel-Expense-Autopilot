import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.user import User

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def check_admin():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == 'admin@dhanpurna.net'))
        user = result.scalars().first()
        if user:
            print(f"Admin role in DB: {user.role}")
        else:
            print("Admin not found in DB")

if __name__ == "__main__":
    asyncio.run(check_admin())
