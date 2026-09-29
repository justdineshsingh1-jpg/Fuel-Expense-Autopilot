from sqlalchemy import Column, String, Boolean, Time, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_code = Column(String(20), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    department = Column(String(100), nullable=True)
    reporting_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    shift_start_time = Column(Time, server_default='09:00')
    shift_end_time = Column(Time, server_default='18:00')
    is_active = Column(Boolean, server_default='true')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    manager = relationship("User", remote_side=[id], backref="subordinates")
    trip_logs = relationship("TripLog", back_populates="user")
    monthly_summaries = relationship("MonthlySummary", back_populates="user")
