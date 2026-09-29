from fastapi import APIRouter

from .auth import router as auth_router
from .trip_logs import router as trip_logs_router
from .locations import router as locations_router
from .fuel_bills import router as fuel_bills_router
from .approvals import router as approvals_router
from .reports import router as reports_router
from .upload import router as upload_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(trip_logs_router, prefix="/trips", tags=["trips"])
api_router.include_router(locations_router, prefix="/trips", tags=["locations"])
api_router.include_router(fuel_bills_router, prefix="/trips", tags=["fuel_bills"])
api_router.include_router(approvals_router, prefix="/approvals", tags=["approvals"])
api_router.include_router(reports_router, prefix="/reports", tags=["reports"])
api_router.include_router(upload_router, prefix="/upload", tags=["upload"])
