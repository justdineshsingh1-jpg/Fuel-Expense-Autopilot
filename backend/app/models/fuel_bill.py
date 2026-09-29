from sqlalchemy import Column, String, Numeric, DateTime, Float, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class FuelBill(Base):
    __tablename__ = "fuel_bills"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    trip_log_id = Column(UUID(as_uuid=True), ForeignKey("trip_logs.id", ondelete="CASCADE"), nullable=False)
    bill_image_url = Column(String, nullable=False)
    bill_amount = Column(Numeric(10, 2), nullable=False)
    fuel_type = Column(String(20), server_default='petrol')
    liters = Column(Numeric(8, 2), nullable=True)
    ocr_detected_amount = Column(Numeric(10, 2), nullable=True)
    pump_name = Column(String(200), nullable=True)
    capture_lat = Column(Float, nullable=True)
    capture_lng = Column(Float, nullable=True)
    capture_timestamp = Column(DateTime(timezone=True), nullable=False)
    remarks = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trip_log = relationship("TripLog", back_populates="fuel_bills")
