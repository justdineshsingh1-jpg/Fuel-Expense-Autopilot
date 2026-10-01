import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def create_bucket():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Create the bucket in the storage schema
            await session.execute(text("INSERT INTO storage.buckets (id, name, public) VALUES ('fuel-receipts', 'fuel-receipts', true) ON CONFLICT (id) DO NOTHING;"))
            
            # Setup a basic policy to allow anyone to read/write for now (since backend handles business logic)
            await session.execute(text("CREATE POLICY \"Public Access\" ON storage.objects FOR ALL USING (bucket_id = 'fuel-receipts');"))
            await session.commit()
            print("Successfully created bucket via SQL!")
        except Exception as e:
            await session.rollback()
            print("Error:", e)

if __name__ == "__main__":
    asyncio.run(create_bucket())
