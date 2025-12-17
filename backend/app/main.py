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
from app.api.memories import router as memories_router
from app.api.feed import router as feed_router

app = FastAPI(
    title="Hippo Campus API",
    description="Photo sharing and memory saving application",
    version="0.1.0",
)

# CORS middleware for frontend
# In debug mode, allow multiple origins for network testing
cors_origins = [settings.FRONTEND_URL]
if settings.DEBUG:
    # Allow common dev ports on any network IP
    cors_origins.extend([
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
    ])
    # Allow all origins in debug mode for mobile testing
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins != ["*"] else cors_origins,
    allow_origin_regex=r"http://\d+\.\d+\.\d+\.\d+:\d+" if settings.DEBUG else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(photos_router)
app.include_router(flashbacks_router)
app.include_router(memories_router)
app.include_router(feed_router)


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
