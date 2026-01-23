"""
Background task for AI image analysis.

This module handles async processing of images through Bedrock,
updating database records with AI-generated labels and descriptions.
"""

import uuid
import logging
from datetime import datetime

import boto3
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import Photo, Memory
from app.services.bedrock import bedrock_service
from app.services.embeddings import embeddings_service

logger = logging.getLogger(__name__)


def get_s3_client():
    """Get S3 client using default credential chain."""
    region = settings.AWS_REGION or "us-east-1"
    return boto3.client("s3", region_name=region)


def download_image_from_s3(s3_key: str) -> tuple[bytes, str]:
    """
    Download an image from S3.
    
    Returns:
        tuple of (image_bytes, media_type)
    """
    bucket = settings.S3_BUCKET_NAME or settings.AWS_S3_BUCKET
    if not bucket:
        raise ValueError("S3 bucket not configured")
    
    s3_client = get_s3_client()
    
    response = s3_client.get_object(Bucket=bucket, Key=s3_key)
    image_bytes = response["Body"].read()
    
    # Get media type from response or infer from extension
    media_type = response.get("ContentType", "image/jpeg")
    if not media_type.startswith("image/"):
        # Infer from extension
        ext = s3_key.rsplit(".", 1)[-1].lower()
        media_type = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "gif": "image/gif",
        }.get(ext, "image/jpeg")
    
    return image_bytes, media_type


def analyze_photo_background(photo_id: uuid.UUID, s3_key: str):
    """
    Background task to analyze a photo with AI.
    
    This runs after the upload endpoint returns, so the user
    doesn't have to wait for AI processing.
    """
    if not bedrock_service.enabled:
        logger.debug(f"Skipping AI analysis for photo {photo_id} - Bedrock disabled")
        return
    
    logger.info(f"Starting AI analysis for photo {photo_id}")
    
    # Create a new database session for background task
    db: Session = SessionLocal()
    
    try:
        # Download image from S3
        image_bytes, media_type = download_image_from_s3(s3_key)
        logger.info(f"Downloaded image from S3: {s3_key} ({len(image_bytes)} bytes)")
        
        # Analyze with Bedrock
        result = bedrock_service.analyze_image(image_bytes, media_type)
        
        # Update database record
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if photo:
            photo.ai_labels = result.labels
            photo.ai_description = result.description
            photo.ai_processed_at = datetime.utcnow()
            photo.ai_error = result.error
            
            # Generate embedding for semantic search
            if result.labels or result.description:
                embedding_result = embeddings_service.generate_embedding_for_photo(
                    result.labels, result.description
                )
                if embedding_result.embedding:
                    photo.embedding = embedding_result.embedding
                    logger.info(f"Generated embedding for photo {photo_id}")
                elif embedding_result.error:
                    logger.warning(f"Embedding generation failed for photo {photo_id}: {embedding_result.error}")
            
            db.commit()
            
            if result.error:
                logger.warning(f"AI analysis for photo {photo_id} completed with error: {result.error}")
            else:
                logger.info(f"AI analysis complete for photo {photo_id}: {len(result.labels)} labels")
        else:
            logger.warning(f"Photo {photo_id} not found in DB after upload")
            
    except ClientError as e:
        logger.error(f"S3 error analyzing photo {photo_id}: {e}")
        # Update photo with error
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if photo:
            photo.ai_error = f"S3 download failed: {str(e)}"
            photo.ai_processed_at = datetime.utcnow()
            db.commit()
    except Exception as e:
        logger.error(f"Error analyzing photo {photo_id}: {type(e).__name__}: {e}")
        # Update photo with error
        try:
            photo = db.query(Photo).filter(Photo.id == photo_id).first()
            if photo:
                photo.ai_error = f"Analysis failed: {str(e)}"
                photo.ai_processed_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass  # Don't fail if we can't update the error
    finally:
        db.close()


def analyze_memory_background(memory_id: uuid.UUID, s3_key: str):
    """
    Background task to analyze a memory with AI.
    
    Same as analyze_photo_background but for Memory records.
    """
    if not bedrock_service.enabled:
        logger.debug(f"Skipping AI analysis for memory {memory_id} - Bedrock disabled")
        return
    
    logger.info(f"Starting AI analysis for memory {memory_id}")
    
    # Create a new database session for background task
    db: Session = SessionLocal()
    
    try:
        # Download image from S3
        image_bytes, media_type = download_image_from_s3(s3_key)
        logger.info(f"Downloaded image from S3: {s3_key} ({len(image_bytes)} bytes)")
        
        # Analyze with Bedrock
        result = bedrock_service.analyze_image(image_bytes, media_type)
        
        # Update database record
        memory = db.query(Memory).filter(Memory.id == memory_id).first()
        if memory:
            memory.ai_labels = result.labels
            memory.ai_description = result.description
            memory.ai_processed_at = datetime.utcnow()
            memory.ai_error = result.error
            
            # Generate embedding for semantic search
            if result.labels or result.description:
                embedding_result = embeddings_service.generate_embedding_for_photo(
                    result.labels, result.description
                )
                if embedding_result.embedding:
                    memory.embedding = embedding_result.embedding
                    logger.info(f"Generated embedding for memory {memory_id}")
                elif embedding_result.error:
                    logger.warning(f"Embedding generation failed for memory {memory_id}: {embedding_result.error}")
            
            db.commit()
            
            if result.error:
                logger.warning(f"AI analysis for memory {memory_id} completed with error: {result.error}")
            else:
                logger.info(f"AI analysis complete for memory {memory_id}: {len(result.labels)} labels")
        else:
            logger.warning(f"Memory {memory_id} not found in DB after upload")
            
    except ClientError as e:
        logger.error(f"S3 error analyzing memory {memory_id}: {e}")
        memory = db.query(Memory).filter(Memory.id == memory_id).first()
        if memory:
            memory.ai_error = f"S3 download failed: {str(e)}"
            memory.ai_processed_at = datetime.utcnow()
            db.commit()
    except Exception as e:
        logger.error(f"Error analyzing memory {memory_id}: {type(e).__name__}: {e}")
        try:
            memory = db.query(Memory).filter(Memory.id == memory_id).first()
            if memory:
                memory.ai_error = f"Analysis failed: {str(e)}"
                memory.ai_processed_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

