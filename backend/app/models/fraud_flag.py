from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class FraudFlag(Base):
    __tablename__ = "fraud_flags"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    trip_log_id = Column(UUID(as_uuid=True), ForeignKey("trip_logs.id"), nullable=False)
    flag_type = Column(String(50), nullable=False)
    severity = Column(String(10), server_default='medium')
    description = Column(String, nullable=False)
    auto_detected = Column(Boolean, server_default='true')
    executive_explanation = Column(String, nullable=True)
    resolved = Column(Boolean, server_default='false')
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trip_log = relationship("TripLog", back_populates="fraud_flags")
    resolver = relationship("User")
