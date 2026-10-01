import asyncio
import asyncpg

async def main():
    try:
        # Test ap-south-1
        conn = await asyncpg.connect("postgresql://postgres.isjsbwjxvpmmgwvvksit:Iloveexperiment%40321@aws-0-ap-south-1.pooler.supabase.com:6543/postgres")
        print("Success ap-south-1!")
        await conn.close()
    except Exception as e:
        print(f"Error ap-south-1: {e}")

    try:
        # Test ap-southeast-1
        conn = await asyncpg.connect("postgresql://postgres.isjsbwjxvpmmgwvvksit:Iloveexperiment%40321@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres")
        print("Success ap-southeast-1!")
        await conn.close()
    except Exception as e:
        print(f"Error ap-southeast-1: {e}")

asyncio.run(main())
