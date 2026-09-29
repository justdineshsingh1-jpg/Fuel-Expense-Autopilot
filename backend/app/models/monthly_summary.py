from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class MonthlySummary(Base):
    __tablename__ = "monthly_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_distance_km = Column(Numeric(10, 1), nullable=True)
    total_fuel_amount = Column(Numeric(10, 2), nullable=True)
    total_working_days = Column(Integer, nullable=True)
    flagged_entries_count = Column(Integer, server_default='0')
    approval_status = Column(String(30), server_default='pending')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="monthly_summaries")
