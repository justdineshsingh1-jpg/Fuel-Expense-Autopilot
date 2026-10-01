import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect("postgresql://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres")
        print("Connected successfully!")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
