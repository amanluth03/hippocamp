import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Event, EventMember, Photo
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventListResponse, JoinEventResponse, EventMemberResponse
from app.services.s3 import s3_service

router = APIRouter(prefix="/events", tags=["Events"])


def get_event_counts(db: Session, event_id) -> tuple:
    """Helper to get member and photo counts for an event."""
    member_count = db.query(func.count(EventMember.id)).filter(
        EventMember.event_id == event_id
    ).scalar()
    photo_count = db.query(func.count(Photo.id)).filter(
        Photo.event_id == event_id
    ).scalar()
    return member_count, photo_count


def get_event_full_response(db: Session, event: Event) -> dict:
    """Get full event data for EventResponse schema."""
    member_count, photo_count = get_event_counts(db, event.id)
    return {
        "id": event.id,
        "name": event.name,
        "description": event.description,
        "location": event.location,
        "event_date": event.event_date,
        "invite_code": event.invite_code,
        "created_by": event.created_by,
        "created_at": event.created_at,
        "member_count": member_count,
        "photo_count": photo_count,
    }


def get_event_list_response(db: Session, event: Event) -> dict:
    """Get event data for EventListResponse schema (fewer fields)."""
    member_count, photo_count = get_event_counts(db, event.id)
    return {
        "id": event.id,
        "name": event.name,
        "location": event.location,
        "event_date": event.event_date,
        "invite_code": event.invite_code,
        "member_count": member_count,
        "photo_count": photo_count,
    }


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new event. The creator is automatically added as an admin member."""
    # Create the event
    event = Event(
        name=event_data.name,
        description=event_data.description,
        location=event_data.location,
        event_date=event_data.event_date,
        created_by=current_user.id,
    )
    db.add(event)
    db.flush()  # Get the event ID
    
    # Add creator as admin member
    membership = EventMember(
        event_id=event.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(membership)
    db.commit()
    db.refresh(event)
    
    return get_event_full_response(db, event)


@router.get("", response_model=List[EventListResponse])
async def list_my_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all events the current user is a member of."""
    # Get event IDs user is a member of
    event_ids = db.query(EventMember.event_id).filter(
        EventMember.user_id == current_user.id
    ).subquery()
    
    events = db.query(Event).filter(Event.id.in_(event_ids)).all()
    
    return [get_event_list_response(db, event) for event in events]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get details of a specific event. User must be a member."""
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    
    # Check if user is a member
    membership = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this event",
        )
    
    return get_event_full_response(db, event)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: uuid.UUID,
    event_data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an event. Only admins can update."""
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    
    # Check if user is an admin
    membership = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this event",
        )
    
    if membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can edit this event",
        )
    
    # Update fields if provided
    if event_data.name is not None:
        event.name = event_data.name
    if event_data.description is not None:
        event.description = event_data.description
    if event_data.location is not None:
        event.location = event_data.location
    if event_data.event_date is not None:
        event.event_date = event_data.event_date
    
    db.commit()
    db.refresh(event)
    
    return get_event_full_response(db, event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an event. Only admins can delete. This also deletes all photos and members."""
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    
    # Check if user is an admin
    membership = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this event",
        )
    
    if membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete this event",
        )
    
    # Delete all photos from S3
    photos = db.query(Photo).filter(Photo.event_id == event_id).all()
    for photo in photos:
        try:
            s3_service.delete_photo(photo.s3_key)
        except Exception:
            pass  # Continue even if S3 delete fails
    
    # Delete all photos from database
    db.query(Photo).filter(Photo.event_id == event_id).delete()
    
    # Delete all event members
    db.query(EventMember).filter(EventMember.event_id == event_id).delete()
    
    # Delete the event
    db.delete(event)
    db.commit()
    
    return None


@router.post("/join/{invite_code}", response_model=JoinEventResponse)
async def join_event(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Join an event using its invite code."""
    event = db.query(Event).filter(Event.invite_code == invite_code).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code",
        )
    
    # Check if already a member
    existing = db.query(EventMember).filter(
        EventMember.event_id == event.id,
        EventMember.user_id == current_user.id,
    ).first()
    
    if existing:
        return JoinEventResponse(
            message="You are already a member of this event",
            event=EventResponse(**get_event_full_response(db, event)),
        )
    
    # Add as member
    membership = EventMember(
        event_id=event.id,
        user_id=current_user.id,
        role="member",
    )
    db.add(membership)
    db.commit()
    
    return JoinEventResponse(
        message="Successfully joined the event!",
        event=EventResponse(**get_event_full_response(db, event)),
    )


@router.get("/{event_id}/members", response_model=List[EventMemberResponse])
async def get_event_members(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all members of an event. User must be a member to view."""
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    
    # Check if user is a member
    membership = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == current_user.id,
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this event",
        )
    
    # Get all members with user info
    members = db.query(EventMember, User).join(
        User, EventMember.user_id == User.id
    ).filter(
        EventMember.event_id == event_id
    ).order_by(
        EventMember.role.desc(),  # admins first
        EventMember.joined_at.asc()
    ).all()
    
    return [
        EventMemberResponse(
            id=member.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            avatar_url=user.avatar_url,
            role=member.role,
            joined_at=member.joined_at,
        )
        for member, user in members
    ]

