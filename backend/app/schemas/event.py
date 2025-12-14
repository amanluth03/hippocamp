import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class EventCreate(BaseModel):
    """Schema for creating a new event."""
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[date] = None


class EventResponse(BaseModel):
    """Schema for event responses."""
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[date] = None
    invite_code: str
    created_by: uuid.UUID
    created_at: datetime
    member_count: int = 0
    photo_count: int = 0

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    """Schema for listing events (simpler, for lists)."""
    id: uuid.UUID
    name: str
    location: Optional[str] = None
    event_date: Optional[date] = None
    invite_code: str
    member_count: int = 0
    photo_count: int = 0

    class Config:
        from_attributes = True


class JoinEventResponse(BaseModel):
    """Response when joining an event."""
    message: str
    event: EventResponse

