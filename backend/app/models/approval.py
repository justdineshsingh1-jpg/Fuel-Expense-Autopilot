from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class ApprovalsAudit(Base):
    __tablename__ = "approvals_audit"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    trip_log_id = Column(UUID(as_uuid=True), ForeignKey("trip_logs.id"), nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approval_level = Column(String(20), nullable=False)
    action = Column(String(20), nullable=False)
    comments = Column(String, nullable=True)
    approved_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trip_log = relationship("TripLog", back_populates="approvals")
    approver = relationship("User")
