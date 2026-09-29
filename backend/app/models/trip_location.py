from sqlalchemy import Column, String, Integer, DateTime, Float, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class TripLocation(Base):
    __tablename__ = "trip_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    trip_log_id = Column(UUID(as_uuid=True), ForeignKey("trip_logs.id", ondelete="CASCADE"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    client_name = Column(String(200), nullable=False)
    visit_purpose = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address_text = Column(String, nullable=True)
    arrival_timestamp = Column(DateTime(timezone=True), nullable=False)
    departure_timestamp = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trip_log = relationship("TripLog", back_populates="locations")
