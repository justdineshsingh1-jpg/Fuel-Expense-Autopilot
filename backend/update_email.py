import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.user import User

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def update_admin_email():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == 'admin@company.com'))
        admin_user = result.scalars().first()
        
        if admin_user:
            admin_user.email = 'admin@dhanpurna.net'
            await session.commit()
            print("Successfully updated admin email to admin@dhanpurna.net!")
        else:
            print("Admin user not found!")

if __name__ == "__main__":
    asyncio.run(update_admin_email())
