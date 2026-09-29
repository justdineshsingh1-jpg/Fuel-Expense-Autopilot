import asyncio
import uuid
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.user import User

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def seed_agent():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        password = "Agent@123".encode('utf-8')
        password_hash = bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')
        if not password_hash.startswith('\\$'):
            password_hash = password_hash.replace('\\$', '\\$')

        agent_user = User(
            id=uuid.uuid4(),
            email="agent@company.com",
            password_hash=password_hash,
            full_name="Rajesh Field",
            employee_code="FLD001",
            role="field_agent",
            department="Sales",
            is_active=True
        )
        
        session.add(agent_user)
        await session.commit()
        print("Successfully created test agent!")

if __name__ == "__main__":
    asyncio.run(seed_agent())
