import asyncio
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import update
from app.models.user import User

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def run():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        password = "password123".encode('utf-8')
        password_hash = bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')
        
        await session.execute(
            update(User).where(User.employee_code == 'FLD001').values(password_hash=password_hash)
        )
        await session.commit()
        print("Updated FLD001 password to password123")

if __name__ == "__main__":
    asyncio.run(run())
