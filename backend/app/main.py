from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.api.auth import router as auth_router
from app.api.events import router as events_router
from app.api.photos import router as photos_router
from app.api.flashbacks import router as flashbacks_router

app = FastAPI(
    title="Hippo Campus API",
    description="Photo sharing and memory saving application",
    version="0.1.0",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(photos_router)
app.include_router(flashbacks_router)


@app.get("/")
async def root():
    return {"message": "Welcome to Hippo Campus!"}


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check that also verifies database connection."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
