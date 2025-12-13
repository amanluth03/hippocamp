from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

app = FastAPI(
    title="Hippo Campus API",
    description="Photo sharing and memory saving application",
    version="0.1.0",
)


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

