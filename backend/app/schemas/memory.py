import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class MemoryCreate(BaseModel):
    """Schema for creating a memory (optional event association)."""
    event_id: Optional[uuid.UUID] = None  # Optional: link to an event


class MemoryResponse(BaseModel):
    """Schema for memory responses."""
    id: uuid.UUID
    user_id: uuid.UUID
    event_id: Optional[uuid.UUID] = None
    url: str  # Public S3 URL
    thumbnail_url: Optional[str] = None
    taken_at: Optional[datetime] = None
    uploaded_at: datetime
    extra_data: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True


class MemoryListResponse(BaseModel):
    """Schema for listing memories (simpler, for gallery view)."""
    id: uuid.UUID
    url: str
    thumbnail_url: Optional[str] = None
    uploaded_at: datetime
    event_id: Optional[uuid.UUID] = None
    event_name: Optional[str] = None  # If linked to an event

    class Config:
        from_attributes = True

