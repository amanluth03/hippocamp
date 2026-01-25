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

# In production, CloudFront routes /api/* to Lambda, so docs need to be at /api/docs
docs_url = "/api/docs" if not settings.DEBUG else "/docs"
redoc_url = "/api/redoc" if not settings.DEBUG else "/redoc"
openapi_url = "/api/openapi.json" if not settings.DEBUG else "/openapi.json"

app = FastAPI(
    title="Hippo Campus API",
    description="Photo sharing and memory saving application",
    version="0.1.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# CORS middleware for frontend
# Production: Only allow the specific frontend domain + Capacitor iOS app
# Development: Allow all origins for mobile/network testing
if settings.DEBUG:
    # Development mode - allow all origins for easier testing
    cors_origins = ["*"]
    cors_origin_regex = r"http://\d+\.\d+\.\d+\.\d+:\d+"  # Allow any IP:port
else:
    # Production mode - allow specific domain and Capacitor iOS app
    cors_origins = [
        settings.FRONTEND_URL,  # Web app
        "capacitor://localhost",  # iOS app (Capacitor)
        "ionic://localhost",  # Alternative Capacitor origin
    ]
    cors_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# In production, CloudFront routes /api/* to Lambda, so we need the /api prefix
# In development, we access the API directly without the prefix
api_prefix = "/api" if not settings.DEBUG else ""

app.include_router(auth_router, prefix=api_prefix)
app.include_router(events_router, prefix=api_prefix)
app.include_router(photos_router, prefix=api_prefix)
app.include_router(flashbacks_router, prefix=api_prefix)
app.include_router(memories_router, prefix=api_prefix)
app.include_router(feed_router, prefix=api_prefix)


@app.get("/")
async def root():
    return {"message": "Welcome to Hippo Campus!"}


@app.get("/api/health")
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check that also verifies database connection."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
