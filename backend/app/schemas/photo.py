import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PhotoResponse(BaseModel):
    """Schema for photo responses."""
    id: uuid.UUID
    event_id: uuid.UUID
    uploaded_by: uuid.UUID
    url: str  # Original full-size URL
    thumb_url: Optional[str] = None  # 300px thumbnail
    medium_url: Optional[str] = None  # 1200px for detail view
    thumbnail_url: Optional[str] = None  # Legacy field, same as thumb_url
    taken_at: Optional[datetime] = None
    uploaded_at: datetime
    is_memory: bool = False

    class Config:
        from_attributes = True


class PhotoListResponse(BaseModel):
    """Schema for listing photos (simpler)."""
    id: uuid.UUID
    url: str  # Original full-size URL
    thumb_url: Optional[str] = None  # 300px thumbnail for grid
    medium_url: Optional[str] = None  # 1200px for detail view
    thumbnail_url: Optional[str] = None  # Legacy field
    uploaded_at: datetime
    uploader_name: str  # Name or email of the person who uploaded
    uploader_email: str

    class Config:
        from_attributes = True

