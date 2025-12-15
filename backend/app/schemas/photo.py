import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PhotoResponse(BaseModel):
    """Schema for photo responses."""
    id: uuid.UUID
    event_id: uuid.UUID
    uploaded_by: uuid.UUID
    url: str  # Public S3 URL
    thumbnail_url: Optional[str] = None
    taken_at: Optional[datetime] = None
    uploaded_at: datetime
    is_memory: bool = False

    class Config:
        from_attributes = True


class PhotoListResponse(BaseModel):
    """Schema for listing photos (simpler)."""
    id: uuid.UUID
    url: str
    thumbnail_url: Optional[str] = None
    uploaded_at: datetime
    uploader_name: str  # Name or email of the person who uploaded
    uploader_email: str

    class Config:
        from_attributes = True

