import asyncio
import uuid
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.user import User

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def seed_admin():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        password = "Admin@123".encode('utf-8')
        password_hash = bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')
        
        if not password_hash.startswith('\\$'):
            password_hash = password_hash.replace('\\$', '\\$')

        admin_user = User(
            id=uuid.uuid4(),
            email="admin@company.com",
            password_hash=password_hash,
            full_name="System Administrator",
            employee_code="ADMIN001",
            role="managing_director",
            department="Executive",
            is_active=True
        )
        
        session.add(admin_user)
        await session.commit()
        print("Successfully created admin user: admin@company.com / Admin@123")

if __name__ == "__main__":
    asyncio.run(seed_admin())
