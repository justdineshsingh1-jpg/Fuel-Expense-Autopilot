import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

async def upgrade_db():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            await session.execute(text("ALTER TABLE trip_logs ADD COLUMN route_map_image_url VARCHAR(255);"))
        except Exception as e:
            await session.rollback()

        try:
            create_table_sql = '''
            CREATE TABLE IF NOT EXISTS trip_waypoints (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                trip_id UUID REFERENCES trip_logs(id) ON DELETE CASCADE,
                latitude NUMERIC(10, 7) NOT NULL,
                longitude NUMERIC(10, 7) NOT NULL,
                accuracy NUMERIC(10, 2),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_processed BOOLEAN DEFAULT FALSE
            );
            '''
            await session.execute(text(create_table_sql))
            await session.execute(text("CREATE INDEX IF NOT EXISTS idx_trip_waypoints_trip_id ON trip_waypoints(trip_id);"))
        except Exception as e:
            await session.rollback()

        await session.commit()
        print("Database upgrade complete.")

if __name__ == "__main__":
    asyncio.run(upgrade_db())
