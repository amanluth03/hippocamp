from urllib.parse import urlencode
from typing import Optional
import base64
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt as jose_jwt, JWTError

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models import User, Memory, Photo, Event, EventMember
from app.schemas.auth import UserResponse, TokenResponse
from app.services.s3 import s3_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"


@router.get("/google/login")
async def google_login(redirect_scheme: Optional[str] = Query(None)):
    """
    Redirect to Google OAuth login page.
    
    Args:
        redirect_scheme: Optional custom URL scheme for native app callback (e.g., 'hippocampus')
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID in environment.",
        )
    
    # Encode state to pass redirect_scheme through OAuth flow
    state_data = {}
    if redirect_scheme:
        state_data["redirect_scheme"] = redirect_scheme
    state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode() if state_data else None
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    if state:
        params["state"] = state
        
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str, 
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback and create/login user."""
    
    # Decode state to get redirect_scheme if present
    redirect_scheme = None
    if state:
        try:
            state_data = json.loads(base64.urlsafe_b64decode(state).decode())
            redirect_scheme = state_data.get("redirect_scheme")
        except Exception:
            pass  # Invalid state, ignore
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            },
        )
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for token",
            )
        
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        
        # Get user info from Google
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google",
            )
        
        google_user = userinfo_response.json()
    
    # Find or create user
    user = db.query(User).filter(User.google_id == google_user["id"]).first()
    
    if not user:
        # Create new user
        user = User(
            email=google_user["email"],
            name=google_user.get("name", google_user["email"]),
            avatar_url=google_user.get("picture"),
            google_id=google_user["id"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create JWT token
    jwt_token = create_access_token(user.id)
    
    # Redirect to native app if redirect_scheme is provided
    if redirect_scheme:
        # Redirect to custom URL scheme for native app
        # Format: hippocampus://auth/callback?token=xxx
        native_url = f"{redirect_scheme}://auth/callback?token={jwt_token}"
        return RedirectResponse(url=native_url)
    
    # Otherwise redirect to frontend web app
    frontend_url = f"{settings.FRONTEND_URL}/auth/callback?token={jwt_token}"
    return RedirectResponse(url=frontend_url)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


@router.post("/apple/callback")
async def apple_callback(
    identity_token: str = Body(..., embed=True),
    full_name: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
):
    """Handle Sign in with Apple. Validates the identity token and creates/logs in the user."""
    try:
        # Fetch Apple's public keys
        async with httpx.AsyncClient() as client:
            keys_response = await client.get(APPLE_KEYS_URL)
            apple_keys = keys_response.json()
        
        # Decode the token header to find the right key
        header = jose_jwt.get_unverified_header(identity_token)
        
        # Find the matching key
        matching_key = None
        for key in apple_keys["keys"]:
            if key["kid"] == header["kid"]:
                matching_key = key
                break
        
        if not matching_key:
            raise HTTPException(status_code=400, detail="Invalid Apple token: no matching key")
        
        # Construct the RSA public key
        from jose import jwk
        public_key = jwk.construct(matching_key)
        
        # Decode and verify the token
        payload = jose_jwt.decode(
            identity_token,
            public_key,
            algorithms=["RS256"],
            audience=settings.APPLE_CLIENT_ID,
            issuer="https://appleid.apple.com",
        )
        
        apple_user_id = payload["sub"]
        email = payload.get("email")
        
    except JWTError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Apple token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Apple sign-in failed: {str(e)}")
    
    # Find user by apple_id
    user = db.query(User).filter(User.apple_id == apple_user_id).first()
    
    if not user and email:
        # Check if user exists with this email (e.g., signed up with Google before)
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.apple_id = apple_user_id
            db.commit()
    
    if not user:
        # Create new user
        user_name = full_name or (email.split("@")[0] if email else "Apple User")
        user = User(
            email=email or f"{apple_user_id}@privaterelay.appleid.com",
            name=user_name,
            apple_id=apple_user_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create JWT token
    jwt_token = create_access_token(user.id)
    return {"token": jwt_token}


@router.delete("/account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the current user's account and all associated data."""
    user_id = current_user.id
    
    # Delete user's memories and their S3 files
    memories = db.query(Memory).filter(Memory.user_id == user_id).all()
    for memory in memories:
        try:
            s3_service.delete_photo(memory.s3_key)
        except Exception:
            pass
    db.query(Memory).filter(Memory.user_id == user_id).delete()
    
    # Delete user's uploaded photos and their S3 files
    photos = db.query(Photo).filter(Photo.uploaded_by == user_id).all()
    for photo in photos:
        try:
            s3_service.delete_photo(photo.s3_key)
        except Exception:
            pass
    db.query(Photo).filter(Photo.uploaded_by == user_id).delete()
    
    # Delete events created by user (and their remaining photos/members)
    events = db.query(Event).filter(Event.created_by == user_id).all()
    for event in events:
        remaining_photos = db.query(Photo).filter(Photo.event_id == event.id).all()
        for photo in remaining_photos:
            try:
                s3_service.delete_photo(photo.s3_key)
            except Exception:
                pass
        db.query(Photo).filter(Photo.event_id == event.id).delete()
        db.query(EventMember).filter(EventMember.event_id == event.id).delete()
        db.delete(event)
    
    # Remove user from events they're a member of (but didn't create)
    db.query(EventMember).filter(EventMember.user_id == user_id).delete()
    
    # Delete the user
    db.delete(current_user)
    db.commit()
    
    return {"message": "Account deleted successfully"}


@router.get("/dev/login")
async def dev_login(email: str, db: Session = Depends(get_db)):
    """
    DEV ONLY: Get a token for any registered user by email.
    Bypasses Google OAuth for easier API testing.
    
    Usage: /auth/dev/login?email=your@email.com
    """
    # Only allow in debug mode
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Sign in with Google first to create your account.",
        )
    
    token = create_access_token(user.id)
    return {
        "token": token,
        "user": user.email,
        "usage": "Copy the token and paste it in Swagger's Authorize button",
    }

