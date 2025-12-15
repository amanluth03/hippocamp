import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Event, EventMember, Photo
from app.services.s3 import s3_service
from pydantic import BaseModel

router = APIRouter(prefix="/flashbacks", tags=["Flashbacks"])


class FlashbackPhoto(BaseModel):
    """A photo that's part of a flashback."""
    id: uuid.UUID
    url: str
    uploaded_at: datetime
    years_ago: int
    event_id: uuid.UUID
    event_name: str
    uploader_name: Optional[str] = None

    class Config:
        from_attributes = True


class FlashbackGroup(BaseModel):
    """Photos grouped by how many years ago they were taken."""
    years_ago: int
    label: str  # e.g., "1 year ago", "2 years ago"
    photos: List[FlashbackPhoto]


class FlashbacksResponse(BaseModel):
    """Response containing all flashbacks for today."""
    date: str  # Today's date formatted nicely
    has_flashbacks: bool
    groups: List[FlashbackGroup]


@router.get("", response_model=FlashbacksResponse)
async def get_flashbacks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get flashback photos for today.
    Returns photos from previous years that were uploaded on this day.
    """
    today = datetime.utcnow()
    current_month = today.month
    current_day = today.day
    current_year = today.year
    
    # Get all event IDs the user is a member of
    user_event_ids = db.query(EventMember.event_id).filter(
        EventMember.user_id == current_user.id
    ).subquery()
    
    # Get photos from those events where month/day matches today, but from previous years
    photos_with_events = db.query(Photo, Event, User).join(
        Event, Photo.event_id == Event.id
    ).join(
        User, Photo.uploaded_by == User.id
    ).filter(
        Photo.event_id.in_(user_event_ids),
        extract('month', Photo.uploaded_at) == current_month,
        extract('day', Photo.uploaded_at) == current_day,
        extract('year', Photo.uploaded_at) < current_year,
    ).order_by(
        Photo.uploaded_at.desc()
    ).all()
    
    # Group photos by years ago
    groups_dict: dict[int, List[FlashbackPhoto]] = {}
    
    for photo, event, uploader in photos_with_events:
        years_ago = current_year - photo.uploaded_at.year
        
        flashback_photo = FlashbackPhoto(
            id=photo.id,
            url=s3_service.get_photo_url(photo.s3_key),
            uploaded_at=photo.uploaded_at,
            years_ago=years_ago,
            event_id=event.id,
            event_name=event.name,
            uploader_name=uploader.name or uploader.email.split('@')[0],
        )
        
        if years_ago not in groups_dict:
            groups_dict[years_ago] = []
        groups_dict[years_ago].append(flashback_photo)
    
    # Convert to list of FlashbackGroup, sorted by years ago (most recent first)
    groups = []
    for years_ago in sorted(groups_dict.keys()):
        label = "1 year ago" if years_ago == 1 else f"{years_ago} years ago"
        groups.append(FlashbackGroup(
            years_ago=years_ago,
            label=label,
            photos=groups_dict[years_ago],
        ))
    
    # Format today's date nicely
    date_str = today.strftime("%B %d")  # e.g., "December 15"
    
    return FlashbacksResponse(
        date=date_str,
        has_flashbacks=len(groups) > 0,
        groups=groups,
    )

