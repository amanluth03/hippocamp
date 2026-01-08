import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"))
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    s3_key: Mapped[str] = mapped_column(String(500))  # Path in S3 bucket
    thumbnail_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    taken_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_memory: Mapped[bool] = mapped_column(Boolean, default=False)  # Saved to memories

    # AI-generated metadata (from Bedrock Claude Vision)
    ai_labels: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # ["beach", "sunset", "people"]
    ai_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # "A sunset over the ocean with people on the beach"
    ai_processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ai_error: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Error message if AI processing failed

    # Relationships
    event = relationship("Event", back_populates="photos")
    uploader = relationship("User", back_populates="photos")
