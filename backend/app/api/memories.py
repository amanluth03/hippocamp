import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Event, EventMember, Memory, Photo
from app.schemas.memory import MemoryResponse, MemoryListResponse
from app.services.s3 import s3_service
from app.services.ai_analysis import analyze_memory_background, analyze_photo_background

router = APIRouter(prefix="/memories", tags=["Memories"])


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


@router.post("/upload", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def upload_memory(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    event_id: Optional[uuid.UUID] = Form(None),  # Optional: link to an event
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a photo to personal memories.
    Optionally link it to an event (user must be a member of that event).
    When linked to an event, the photo also appears in that event's gallery.
    """
    # If linking to an event, verify membership
    if event_id:
        check_event_membership(db, event_id, current_user.id)
    
    # Upload to S3 (memories path)
    s3_key = await s3_service.upload_memory(file, current_user.id)
    
    # Create memory record
    memory = Memory(
        user_id=current_user.id,
        event_id=event_id,
        s3_key=s3_key,
    )
    db.add(memory)
    
    # If linked to an event, also create a Photo record so it shows in event gallery
    photo = None
    if event_id:
        photo = Photo(
            event_id=event_id,
            uploaded_by=current_user.id,
            s3_key=s3_key,  # Reuse the same S3 key
        )
        db.add(photo)
    
    db.commit()
    db.refresh(memory)
    
    # Trigger AI analysis in background (doesn't block response)
    background_tasks.add_task(analyze_memory_background, memory.id, memory.s3_key)
    # Also analyze the photo record if linked to event
    if photo:
        db.refresh(photo)
        background_tasks.add_task(analyze_photo_background, photo.id, photo.s3_key)
    
    # Note: ai_labels/ai_description will be None initially, populated by background task
    return MemoryResponse(
        id=memory.id,
        user_id=memory.user_id,
        event_id=memory.event_id,
        url=s3_service.get_photo_url(memory.s3_key),
        thumb_url=s3_service.get_thumb_url(memory.s3_key),
        medium_url=s3_service.get_medium_url(memory.s3_key),
        thumbnail_url=s3_service.get_thumb_url(memory.s3_key),  # Legacy
        taken_at=memory.taken_at,
        uploaded_at=memory.uploaded_at,
        extra_data=memory.extra_data,
        ai_labels=memory.ai_labels,
        ai_description=memory.ai_description,
        ai_processed_at=memory.ai_processed_at,
    )


@router.get("", response_model=List[MemoryListResponse])
async def list_memories(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    event_id: Optional[uuid.UUID] = Query(None),  # Optional filter by event
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List user's personal memories (paginated).
    Optionally filter by event.
    """
    query = db.query(Memory).filter(Memory.user_id == current_user.id)
    
    # Optional event filter
    if event_id:
        query = query.filter(Memory.event_id == event_id)
    
    # Order by most recent first
    memories = query.order_by(Memory.uploaded_at.desc()).offset(offset).limit(limit).all()
    
    # Build response with event names
    result = []
    for memory in memories:
        event_name = None
        if memory.event_id:
            event = db.query(Event).filter(Event.id == memory.event_id).first()
            if event:
                event_name = event.name
        
        result.append(MemoryListResponse(
            id=memory.id,
            url=s3_service.get_photo_url(memory.s3_key),
            thumb_url=s3_service.get_thumb_url(memory.s3_key),
            medium_url=s3_service.get_medium_url(memory.s3_key),
            thumbnail_url=s3_service.get_thumb_url(memory.s3_key),  # Legacy
            uploaded_at=memory.uploaded_at,
            event_id=memory.event_id,
            event_name=event_name,
            ai_labels=memory.ai_labels,
            ai_description=memory.ai_description,
        ))
    
    return result


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    memory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific memory by ID."""
    memory = db.query(Memory).filter(
        Memory.id == memory_id,
        Memory.user_id == current_user.id,
    ).first()
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )
    
    return MemoryResponse(
        id=memory.id,
        user_id=memory.user_id,
        event_id=memory.event_id,
        url=s3_service.get_photo_url(memory.s3_key),
        thumb_url=s3_service.get_thumb_url(memory.s3_key),
        medium_url=s3_service.get_medium_url(memory.s3_key),
        thumbnail_url=s3_service.get_thumb_url(memory.s3_key),  # Legacy
        taken_at=memory.taken_at,
        uploaded_at=memory.uploaded_at,
        extra_data=memory.extra_data,
        ai_labels=memory.ai_labels,
        ai_description=memory.ai_description,
        ai_processed_at=memory.ai_processed_at,
    )


@router.patch("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    memory_id: uuid.UUID,
    event_id: Optional[uuid.UUID] = None,  # Link/unlink from event
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a memory (e.g., link/unlink from an event).
    Pass event_id to link, pass null/omit to unlink.
    """
    memory = db.query(Memory).filter(
        Memory.id == memory_id,
        Memory.user_id == current_user.id,
    ).first()
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )
    
    # If linking to an event, verify membership
    if event_id:
        check_event_membership(db, event_id, current_user.id)
    
    memory.event_id = event_id
    db.commit()
    db.refresh(memory)
    
    return MemoryResponse(
        id=memory.id,
        user_id=memory.user_id,
        event_id=memory.event_id,
        url=s3_service.get_photo_url(memory.s3_key),
        thumb_url=s3_service.get_thumb_url(memory.s3_key),
        medium_url=s3_service.get_medium_url(memory.s3_key),
        thumbnail_url=s3_service.get_thumb_url(memory.s3_key),  # Legacy
        taken_at=memory.taken_at,
        uploaded_at=memory.uploaded_at,
        extra_data=memory.extra_data,
        ai_labels=memory.ai_labels,
        ai_description=memory.ai_description,
        ai_processed_at=memory.ai_processed_at,
    )


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a memory. Only the owner can delete their memories."""
    memory = db.query(Memory).filter(
        Memory.id == memory_id,
        Memory.user_id == current_user.id,
    ).first()
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )
    
    # Delete from S3
    s3_service.delete_photo(memory.s3_key)
    
    # Delete from database
    db.delete(memory)
    db.commit()
    
    return None

