import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, Event, EventMember, Photo, Memory
from app.services.s3 import s3_service
from app.services.search_intelligence import search_intelligence

router = APIRouter(prefix="/feed", tags=["Feed"])


class FeedItem(BaseModel):
    """A single item in the feed (either a photo from an event or a memory)."""
    id: str
    type: str  # "event_photo" or "memory"
    url: str
    thumbnail_url: Optional[str] = None
    uploaded_at: datetime
    
    # For event photos
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    uploader_name: Optional[str] = None
    
    # For memories
    is_personal: bool = False
    
    # AI-generated metadata
    ai_labels: Optional[List[str]] = None
    ai_description: Optional[str] = None

    class Config:
        from_attributes = True


class FeedResponse(BaseModel):
    """Paginated feed response."""
    items: List[FeedItem]
    has_more: bool
    next_offset: int


class SearchResultItem(BaseModel):
    """A single search result item."""
    id: str
    type: str  # "event_photo" or "memory"
    url: str
    thumbnail_url: Optional[str] = None
    uploaded_at: datetime
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    uploader_name: Optional[str] = None
    is_personal: bool = False
    
    # AI-generated metadata
    ai_labels: Optional[List[str]] = None
    ai_description: Optional[str] = None

    class Config:
        from_attributes = True


class SearchInterpretation(BaseModel):
    """How the search query was interpreted."""
    original_query: str
    keywords: List[str]
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    used_ai: bool = False


class SearchResponse(BaseModel):
    """Search results response."""
    query: str
    results: List[SearchResultItem]
    total: int
    interpretation: Optional[SearchInterpretation] = None


@router.get("/search", response_model=SearchResponse)
async def search_photos(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Search across all photos the user has access to (their memories + event photos).
    
    Supports natural language queries like:
    - "beach" - simple keyword search
    - "photos from last week" - date-based search
    - "summer 2025 vacation" - season + keyword search
    - "happy moments from december" - complex queries (AI-interpreted)
    """
    from sqlalchemy import or_, func, cast, String, and_
    
    # Use search intelligence to interpret the query
    intent = search_intelligence.interpret_query(q)
    
    # Get all event IDs the user is a member of
    member_event_ids = db.query(EventMember.event_id).filter(
        EventMember.user_id == current_user.id
    ).all()
    event_ids = [e[0] for e in member_event_ids]
    
    results = []
    seen_urls = set()  # Deduplicate by URL
    events_map = {}
    
    # Build keyword search conditions
    def build_keyword_conditions(model, keywords: list[str]):
        """Build OR conditions for keyword search across labels and description."""
        if not keywords:
            return None
        
        conditions = []
        for keyword in keywords:
            conditions.append(cast(model.ai_labels, String).ilike(f"%{keyword}%"))
            conditions.append(model.ai_description.ilike(f"%{keyword}%"))
        return or_(*conditions)
    
    # Build date filter conditions
    def build_date_conditions(model, date_start, date_end):
        """Build date range filter."""
        conditions = []
        if date_start:
            conditions.append(model.uploaded_at >= date_start)
        if date_end:
            conditions.append(model.uploaded_at <= date_end)
        return and_(*conditions) if conditions else None
    
    # Search user's memories
    memory_query = db.query(Memory).filter(Memory.user_id == current_user.id)
    
    # Apply date filters
    date_conditions = build_date_conditions(Memory, intent.date_start, intent.date_end)
    if date_conditions is not None:
        memory_query = memory_query.filter(date_conditions)
    
    # Apply keyword search (only if we have keywords)
    if intent.keywords:
        keyword_conditions = build_keyword_conditions(Memory, intent.keywords)
        if keyword_conditions is not None:
            memory_query = memory_query.filter(
                Memory.ai_labels.isnot(None),  # Only search AI-processed photos
                keyword_conditions
            )
    elif not intent.has_date_filter:
        # No keywords and no date filter - fall back to original query as search term
        search_term = q.lower().strip()
        memory_query = memory_query.filter(
            Memory.ai_labels.isnot(None),
            or_(
                cast(Memory.ai_labels, String).ilike(f"%{search_term}%"),
                Memory.ai_description.ilike(f"%{search_term}%"),
            )
        )
    
    memories = memory_query.order_by(Memory.uploaded_at.desc()).limit(limit).all()
    
    # Pre-fetch event names for memories
    memory_event_ids = [m.event_id for m in memories if m.event_id]
    if memory_event_ids:
        for event_id in set(memory_event_ids):
            event = db.query(Event).filter(Event.id == event_id).first()
            if event:
                events_map[event_id] = event.name
    
    for memory in memories:
        url = s3_service.get_photo_url(memory.s3_key)
        if url not in seen_urls:
            seen_urls.add(url)
            results.append(SearchResultItem(
                id=f"memory_{memory.id}",
                type="memory",
                url=url,
                thumbnail_url=s3_service.get_thumb_url(memory.s3_key),
                uploaded_at=memory.uploaded_at,
                event_id=str(memory.event_id) if memory.event_id else None,
                event_name=events_map.get(memory.event_id),
                uploader_name="You",
                is_personal=True,
                ai_labels=memory.ai_labels,
                ai_description=memory.ai_description,
            ))
    
    # Search photos from events user is a member of
    if event_ids:
        photo_query = db.query(Photo).filter(Photo.event_id.in_(event_ids))
        
        # Apply date filters
        date_conditions = build_date_conditions(Photo, intent.date_start, intent.date_end)
        if date_conditions is not None:
            photo_query = photo_query.filter(date_conditions)
        
        # Apply keyword search
        if intent.keywords:
            keyword_conditions = build_keyword_conditions(Photo, intent.keywords)
            if keyword_conditions is not None:
                photo_query = photo_query.filter(
                    Photo.ai_labels.isnot(None),
                    keyword_conditions
                )
        elif not intent.has_date_filter:
            # Fall back to original query
            search_term = q.lower().strip()
            photo_query = photo_query.filter(
                Photo.ai_labels.isnot(None),
                or_(
                    cast(Photo.ai_labels, String).ilike(f"%{search_term}%"),
                    Photo.ai_description.ilike(f"%{search_term}%"),
                )
            )
        
        photos = photo_query.order_by(Photo.uploaded_at.desc()).limit(limit).all()
        
        # Pre-fetch events and uploaders
        if photos:
            for event_id in set(event_ids):
                if event_id not in events_map:
                    event = db.query(Event).filter(Event.id == event_id).first()
                    if event:
                        events_map[event_id] = event.name
            
            users_map = {}
            uploader_ids = list(set(p.uploaded_by for p in photos))
            for uid in uploader_ids:
                user = db.query(User).filter(User.id == uid).first()
                if user:
                    users_map[uid] = user.name or user.email
            
            for photo in photos:
                url = s3_service.get_photo_url(photo.s3_key)
                if url not in seen_urls:
                    seen_urls.add(url)
                    is_personal = photo.uploaded_by == current_user.id
                    results.append(SearchResultItem(
                        id=f"photo_{photo.id}",
                        type="event_photo",
                        url=url,
                        thumbnail_url=s3_service.get_thumb_url(photo.s3_key),
                        uploaded_at=photo.uploaded_at,
                        event_id=str(photo.event_id),
                        event_name=events_map.get(photo.event_id, "Unknown Event"),
                        uploader_name="You" if is_personal else users_map.get(photo.uploaded_by, "Unknown"),
                        is_personal=is_personal,
                        ai_labels=photo.ai_labels,
                        ai_description=photo.ai_description,
                    ))
    
    # Sort all results by uploaded_at (newest first)
    results.sort(key=lambda x: x.uploaded_at, reverse=True)
    
    # Apply limit
    results = results[:limit]
    
    # Build interpretation response
    interpretation = SearchInterpretation(
        original_query=intent.original_query,
        keywords=intent.keywords,
        date_start=intent.date_start,
        date_end=intent.date_end,
        used_ai=intent.used_ai,
    )
    
    return SearchResponse(
        query=q,
        results=results,
        total=len(results),
        interpretation=interpretation,
    )


@router.get("", response_model=FeedResponse)
async def get_feed(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a unified feed of photos from all events the user is a member of,
    plus their personal memories. Sorted by upload date (newest first).
    """
    # Get all event IDs the user is a member of
    member_event_ids = db.query(EventMember.event_id).filter(
        EventMember.user_id == current_user.id
    ).all()
    event_ids = [e[0] for e in member_event_ids]
    
    # Build a list of feed items from event photos
    event_photos = []
    if event_ids:
        photos = db.query(Photo).filter(
            Photo.event_id.in_(event_ids)
        ).all()
        
        # Pre-fetch events and uploaders for efficiency
        events_map = {}
        for event_id in event_ids:
            event = db.query(Event).filter(Event.id == event_id).first()
            if event:
                events_map[event_id] = event.name
        
        users_map = {}
        uploader_ids = list(set(p.uploaded_by for p in photos))
        for uid in uploader_ids:
            user = db.query(User).filter(User.id == uid).first()
            if user:
                users_map[uid] = user.name or user.email
        
        for photo in photos:
            event_photos.append(FeedItem(
                id=f"photo_{photo.id}",
                type="event_photo",
                url=s3_service.get_photo_url(photo.s3_key),
                thumbnail_url=s3_service.get_thumb_url(photo.s3_key),
                uploaded_at=photo.uploaded_at,
                event_id=str(photo.event_id),
                event_name=events_map.get(photo.event_id, "Unknown Event"),
                uploader_name=users_map.get(photo.uploaded_by, "Unknown"),
                is_personal=False,
                ai_labels=photo.ai_labels,
                ai_description=photo.ai_description,
            ))
    
    # Build a list of feed items from personal memories
    memories = db.query(Memory).filter(
        Memory.user_id == current_user.id
    ).all()
    
    memory_items = []
    for memory in memories:
        # Get event name if linked
        event_name = None
        if memory.event_id:
            event = db.query(Event).filter(Event.id == memory.event_id).first()
            if event:
                event_name = event.name
        
        memory_items.append(FeedItem(
            id=f"memory_{memory.id}",
            type="memory",
            url=s3_service.get_photo_url(memory.s3_key),
            thumbnail_url=s3_service.get_thumb_url(memory.s3_key),
            uploaded_at=memory.uploaded_at,
            event_id=str(memory.event_id) if memory.event_id else None,
            event_name=event_name,
            uploader_name="You",
            is_personal=True,
            ai_labels=memory.ai_labels,
            ai_description=memory.ai_description,
        ))
    
    # Combine and sort by uploaded_at (newest first)
    all_items = event_photos + memory_items
    all_items.sort(key=lambda x: x.uploaded_at, reverse=True)
    
    # Deduplicate: if a memory is linked to an event, don't show the event photo duplicate
    # (since uploading a memory to an event creates both a Memory and Photo record)
    seen_urls = set()
    unique_items = []
    for item in all_items:
        if item.url not in seen_urls:
            seen_urls.add(item.url)
            unique_items.append(item)
    
    # Apply pagination
    total = len(unique_items)
    paginated_items = unique_items[offset:offset + limit]
    has_more = offset + limit < total
    
    return FeedResponse(
        items=paginated_items,
        has_more=has_more,
        next_offset=offset + limit if has_more else offset,
    )

