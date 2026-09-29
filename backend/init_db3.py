from sqlalchemy import create_engine
from app.database import Base
from app.models.user import User
from app.models.trip_log import TripLog
from app.models.trip_location import TripLocation
from app.models.fuel_bill import FuelBill
from app.models.approval import ApprovalsAudit
from app.models.fraud_flag import FraudFlag
from app.models.monthly_summary import MonthlySummary

DATABASE_URL = "postgresql://postgres:Iloveexperiment%40321@db.isjsbwjxvpmmgwvvksit.supabase.co:5432/postgres"

engine = create_engine(DATABASE_URL)
Base.metadata.create_all(engine)
print("Tables created sync!")
