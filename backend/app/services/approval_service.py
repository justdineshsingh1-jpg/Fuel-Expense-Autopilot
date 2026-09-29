from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from app.models.trip_log import TripLog
from app.models.approval import ApprovalsAudit
from app.models.user import User

TRANSITIONS = {
    'submitted': {'allowed_roles': ['field_executive'], 'next_status': 'tl_pending'},
    'tl_pending': {'allowed_roles': ['team_leader'], 'next_status': 'mgr_pending'},
    'mgr_pending': {'allowed_roles': ['manager'], 'next_status': 'md_pending'},
    'md_pending': {'allowed_roles': ['managing_director'], 'next_status': 'accounts_pending'},
    'accounts_pending': {'allowed_roles': ['accounts'], 'next_status': 'accounts_approved'},
}

async def advance_approval(trip_log_id: str, approver: User, action: str, comments: str, db: AsyncSession):
    stmt = select(TripLog).where(TripLog.id == trip_log_id)
    result = await db.execute(stmt)
    trip_log = result.scalar_one_or_none()
    
    if not trip_log:
        raise HTTPException(status_code=404, detail="Trip log not found")
        
    current_status = trip_log.approval_status
    
    if action == 'returned':
        trip_log.approval_status = 'draft'
    elif action == 'rejected':
        trip_log.approval_status = 'rejected'
    elif action == 'approved':
        if current_status not in TRANSITIONS:
            raise HTTPException(status_code=400, detail="Cannot approve from current state")
            
        trans = TRANSITIONS[current_status]
        if approver.role not in trans['allowed_roles']:
            raise HTTPException(status_code=403, detail="Not authorized to approve at this stage")
            
        trip_log.approval_status = trans['next_status']
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    audit = ApprovalsAudit(
        trip_log_id=trip_log.id,
        approver_id=approver.id,
        approval_level=approver.role,
        action=action,
        comments=comments
    )
    db.add(audit)
    await db.commit()
    return trip_log

async def get_pending_for_approver(approver: User, db: AsyncSession):
    status_map = {
        'team_leader': 'tl_pending',
        'manager': 'mgr_pending',
        'managing_director': 'md_pending',
        'accounts': 'accounts_pending'
    }
    
    pending_status = status_map.get(approver.role)
    if not pending_status:
        return []
        
    stmt = select(TripLog).where(TripLog.approval_status == pending_status)
    result = await db.execute(stmt)
    return result.scalars().all()
