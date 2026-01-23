import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base


class Memory(Base):
    """
    Personal memories - photos saved independently of events.
    Can optionally be linked to an event.
    """
    __tablename__ = "memories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    event_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("events.id"), nullable=True, index=True
    )  # Optional: link memory to an event
    s3_key: Mapped[str] = mapped_column(String(500))
    thumbnail_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    taken_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # EXIF data, etc.

    # AI-generated metadata (from Bedrock Claude Vision)
    ai_labels: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # ["beach", "sunset", "people"]
    ai_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # "A sunset over the ocean with people on the beach"
    ai_processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ai_error: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Error message if AI processing failed
    
    # Vector embedding for semantic search (Titan Embeddings - 1024 dimensions)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(1024), nullable=True)

    # Relationships
    user = relationship("User", back_populates="memories")
    event = relationship("Event", back_populates="memories")

