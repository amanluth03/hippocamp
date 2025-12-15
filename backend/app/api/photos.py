import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Event, EventMember, Photo
from app.schemas.photo import PhotoResponse, PhotoListResponse
from app.services.s3 import s3_service

router = APIRouter(prefix="/photos", tags=["Photos"])


def check_event_membership(db: Session, event_id: uuid.UUID, user_id: uuid.UUID) -> Event:
    """Check if user is a member of the event and return the event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    
    membership = db.query(EventMember).filter(
        EventMember.event_id == event_id,
        EventMember.user_id == user_id,
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this event",
        )
    
    return event


@router.post("/upload", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    event_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a photo to an event."""
    # Verify membership
    event = check_event_membership(db, event_id, current_user.id)
    
    # Upload to S3
    s3_key = await s3_service.upload_photo(file, event_id)
    
    # Create photo record
    photo = Photo(
        event_id=event_id,
        uploaded_by=current_user.id,
        s3_key=s3_key,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    
    # Return with URL
    return PhotoResponse(
        id=photo.id,
        event_id=photo.event_id,
        uploaded_by=photo.uploaded_by,
        url=s3_service.get_photo_url(photo.s3_key),
        thumbnail_url=None,  # TODO: Generate thumbnails later
        taken_at=photo.taken_at,
        uploaded_at=photo.uploaded_at,
        is_memory=photo.is_memory,
    )


@router.get("/event/{event_id}", response_model=List[PhotoListResponse])
async def list_event_photos(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all photos for an event."""
    # Verify membership
    check_event_membership(db, event_id, current_user.id)
    
    # Get photos with uploader info
    photos = db.query(Photo, User).join(
        User, Photo.uploaded_by == User.id
    ).filter(
        Photo.event_id == event_id
    ).order_by(
        Photo.uploaded_at.desc()
    ).all()
    
    return [
        PhotoListResponse(
            id=photo.id,
            url=s3_service.get_photo_url(photo.s3_key),
            thumbnail_url=None,
            uploaded_at=photo.uploaded_at,
            uploader_name=user.name or user.email.split('@')[0],
            uploader_email=user.email,
        )
        for photo, user in photos
    ]


@router.get("/{photo_id}", response_model=PhotoResponse)
async def get_photo(
    photo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific photo."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found",
        )
    
    # Verify membership
    check_event_membership(db, photo.event_id, current_user.id)
    
    return PhotoResponse(
        id=photo.id,
        event_id=photo.event_id,
        uploaded_by=photo.uploaded_by,
        url=s3_service.get_photo_url(photo.s3_key),
        thumbnail_url=None,
        taken_at=photo.taken_at,
        uploaded_at=photo.uploaded_at,
        is_memory=photo.is_memory,
    )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a photo. 
    Only the uploader or an event admin can delete a photo.
    """
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found",
        )
    
    # Check if user is uploader
    is_uploader = photo.uploaded_by == current_user.id
    
    # Check if user is event admin
    membership = db.query(EventMember).filter(
        EventMember.event_id == photo.event_id,
        EventMember.user_id == current_user.id,
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this event",
        )
    
    is_admin = membership.role == "admin"
    
    if not is_uploader and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the uploader or event admin can delete this photo",
        )
    
    # Delete from S3
    s3_service.delete_photo(photo.s3_key)
    
    # Delete from database
    db.delete(photo)
    db.commit()
    
    return None

