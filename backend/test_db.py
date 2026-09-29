import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys

async def test_db():
    engine = create_async_engine('postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres')
    try:
        async with engine.begin() as conn:
            await conn.execute(text('SELECT 1'))
            print('CONNECTION SUCCESSFUL!')
            
            res = await conn.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = res.scalar()
            print(f'Found {tables} tables in the public schema.')
            if tables < 7:
                print("TABLES MISSING - Needs schema applied.")
    except Exception as e:
        print('FAILED:', str(e))

if __name__ == '__main__':
    asyncio.run(test_db())
