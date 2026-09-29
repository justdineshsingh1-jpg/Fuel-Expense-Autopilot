from sqlalchemy import Column, String, Numeric, Date, DateTime, Float, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class TripLog(Base):
    __tablename__ = "trip_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    log_date = Column(Date, server_default=func.current_date(), nullable=False)
    start_reading = Column(Numeric(10, 1), nullable=False)
    end_reading = Column(Numeric(10, 1), nullable=False)
    distance_km = Column(Numeric(10, 1), nullable=True) # Managed by DB generated column
    start_odometer_image_url = Column(String, nullable=False)
    end_odometer_image_url = Column(String, nullable=False)
    start_reading_ocr = Column(Numeric(10, 1), nullable=True)
    end_reading_ocr = Column(Numeric(10, 1), nullable=True)
    start_capture_timestamp = Column(DateTime(timezone=True), nullable=False)
    end_capture_timestamp = Column(DateTime(timezone=True), nullable=False)
    start_lat = Column(Float, nullable=True)
    start_lng = Column(Float, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_lng = Column(Float, nullable=True)
    osrm_calculated_km = Column(Numeric(10, 1), nullable=True)
    variance_percent = Column(Numeric(5, 2), nullable=True)
    approval_status = Column(String(30), server_default='draft', nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="trip_logs")
    locations = relationship("TripLocation", back_populates="trip_log", cascade="all, delete-orphan")
    fuel_bills = relationship("FuelBill", back_populates="trip_log", cascade="all, delete-orphan")
    approvals = relationship("ApprovalsAudit", back_populates="trip_log")
    fraud_flags = relationship("FraudFlag", back_populates="trip_log")
