from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.services.approval_service import advance_approval, get_pending_for_approver
from app.schemas.approval import ApprovalAction
from app.models.user import User

router = APIRouter()

@router.get("/pending")
async def get_pending_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_pending_for_approver(current_user, db)

@router.post("/{trip_id}/approve")
async def approve_trip(
    trip_id: str,
    action: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await advance_approval(trip_id, current_user, "approved", action.comments, db)

@router.post("/{trip_id}/reject")
async def reject_trip(
    trip_id: str,
    action: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await advance_approval(trip_id, current_user, "rejected", action.comments, db)
