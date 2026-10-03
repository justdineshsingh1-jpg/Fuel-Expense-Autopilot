import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres')
    tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    print("Tables:", [t['table_name'] for t in tables])
    
    # Check trip_logs schema
    if 'trip_logs' in [t['table_name'] for t in tables]:
        cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trip_logs'")
        print("trip_logs columns:", [f"{c['column_name']} ({c['data_type']})" for c in cols])
        
        # Add the columns if they don't exist
        existing_cols = [c['column_name'] for c in cols]
        if 'waypoints' not in existing_cols:
            await conn.execute("ALTER TABLE trip_logs ADD COLUMN waypoints JSONB DEFAULT '[]'::jsonb")
            print("Added waypoints column")
        if 'locations_visited' not in existing_cols:
            await conn.execute("ALTER TABLE trip_logs ADD COLUMN locations_visited TEXT")
            print("Added locations_visited column")
        if 'status' not in existing_cols:
            await conn.execute("ALTER TABLE trip_logs ADD COLUMN status TEXT")
            print("Added status column")
        if 'agent_id' not in existing_cols:
            await conn.execute("ALTER TABLE trip_logs ADD COLUMN agent_id TEXT")
            print("Added agent_id column")
        if 'route_map_image_url' not in existing_cols:
            await conn.execute("ALTER TABLE trip_logs ADD COLUMN route_map_image_url TEXT")
            print("Added route_map_image_url column")
        if 'start_time' not in existing_cols:
            await conn.execute("ALTER TABLE trip_logs ADD COLUMN start_time TIMESTAMP")
            print("Added start_time column")
        if 'end_time' not in existing_cols:
            await conn.execute("ALTER TABLE trip_logs ADD COLUMN end_time TIMESTAMP")
            print("Added end_time column")
            
    await conn.close()

asyncio.run(main())
