from urllib.parse import urlencode
from typing import Optional
import base64
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models import User
from app.schemas.auth import UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


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

