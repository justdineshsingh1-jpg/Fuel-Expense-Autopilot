from app.models.user import User
from app.models.trip_log import TripLog
from app.models.trip_location import TripLocation
from app.models.fuel_bill import FuelBill
from app.models.approval import ApprovalsAudit
from app.models.fraud_flag import FraudFlag
from app.models.monthly_summary import MonthlySummary

# Expose models to base initialization
__all__ = [
    "User",
    "TripLog",
    "TripLocation",
    "FuelBill",
    "ApprovalsAudit",
    "FraudFlag",
    "MonthlySummary"
]
