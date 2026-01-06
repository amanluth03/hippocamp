import uuid
import logging
from datetime import datetime
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    """Service for handling S3 photo uploads."""
    
    def __init__(self):
        # Support both S3_BUCKET_NAME and AWS_S3_BUCKET (Terraform compatibility)
        bucket_name = settings.S3_BUCKET_NAME or settings.AWS_S3_BUCKET
        if not bucket_name:
            raise ValueError("S3_BUCKET_NAME or AWS_S3_BUCKET not configured")
        
        # Get region
        region = settings.AWS_REGION or settings.AWS_S3_REGION or "us-east-1"
        
        logger.info(f"Initializing S3Service: bucket={bucket_name}, region={region}")
        
        # Let boto3 handle credentials automatically:
        # - In Lambda: uses IAM role credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
        # - Locally: uses ~/.aws/credentials or environment variables
        # Never pass explicit credentials - boto3's default chain handles all cases
        self.s3_client = boto3.client("s3", region_name=region)
        logger.info("S3 client initialized with default credential chain")
        
        self.bucket_name = bucket_name
    
    def generate_s3_key(self, event_id: uuid.UUID, filename: str) -> str:
        """Generate a unique S3 key for a photo."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        extension = filename.split(".")[-1] if "." in filename else "jpg"
        return f"events/{event_id}/photos/{timestamp}_{unique_id}.{extension}"
    
    def generate_memory_s3_key(self, user_id: uuid.UUID, filename: str) -> str:
        """Generate a unique S3 key for a personal memory."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        extension = filename.split(".")[-1] if "." in filename else "jpg"
        return f"memories/{user_id}/{timestamp}_{unique_id}.{extension}"
    
    async def upload_photo(
        self,
        file: UploadFile,
        event_id: uuid.UUID,
    ) -> str:
        """
        Upload a photo to S3 and return the S3 key.
        
        Args:
            file: The uploaded file
            event_id: The event this photo belongs to
            
        Returns:
            str: The S3 key of the uploaded photo
        """
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image",
            )
        
        # Generate S3 key
        s3_key = self.generate_s3_key(event_id, file.filename or "photo.jpg")
        
        try:
            # Read file content
            content = await file.read()
            logger.info(f"Uploading photo to S3: bucket={self.bucket_name}, key={s3_key}, size={len(content)}")
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=file.content_type,
            )
            
            logger.info(f"Successfully uploaded photo: {s3_key}")
            return s3_key
        except ClientError as e:
            logger.error(f"S3 ClientError uploading photo: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload photo: {str(e)}",
            )
        except Exception as e:
            logger.error(f"Unexpected error uploading photo: {type(e).__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload photo: {str(e)}",
            )
    
    async def upload_memory(
        self,
        file: UploadFile,
        user_id: uuid.UUID,
    ) -> str:
        """
        Upload a personal memory to S3 and return the S3 key.
        
        Args:
            file: The uploaded file
            user_id: The user saving this memory
            
        Returns:
            str: The S3 key of the uploaded memory
        """
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image",
            )
        
        # Generate S3 key for memory
        s3_key = self.generate_memory_s3_key(user_id, file.filename or "memory.jpg")
        
        try:
            # Read file content
            content = await file.read()
            logger.info(f"Uploading memory to S3: bucket={self.bucket_name}, key={s3_key}, size={len(content)}")
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=file.content_type,
            )
            
            logger.info(f"Successfully uploaded memory: {s3_key}")
            return s3_key
        except ClientError as e:
            logger.error(f"S3 ClientError uploading memory: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload memory: {str(e)}",
            )
        except Exception as e:
            logger.error(f"Unexpected error uploading memory: {type(e).__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload memory: {str(e)}",
            )
    
    def _get_url(self, s3_key: str) -> str:
        """Get the URL for an S3 key (internal helper).
        
        - Production: Uses CloudFront URL (https://thehippocampus.net/photos/...)
        - Development: Uses presigned S3 URL (direct S3 access)
        """
        # In development, use presigned URLs since local frontend can't serve S3 photos
        if settings.DEBUG:
            try:
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket_name, 'Key': s3_key},
                    ExpiresIn=3600 * 24  # 24 hours
                )
                return url
            except ClientError as e:
                logger.error(f"Failed to generate presigned URL: {e}")
                # Fall through to CloudFront URL
        
        # Production: Photos served through CloudFront at /photos/ path
        frontend_url = settings.FRONTEND_URL or "https://thehippocampus.net"
        return f"{frontend_url}/photos/{s3_key}"
    
    def get_photo_url(self, s3_key: str) -> str:
        """Get the URL for the original photo."""
        return self._get_url(s3_key)
    
    def get_thumbnail_key(self, s3_key: str, size: str = "thumb") -> str:
        """Generate the S3 key for a thumbnail.
        
        Args:
            s3_key: Original S3 key (e.g., memories/user123/20240101_abc.jpg)
            size: "thumb" (300px) or "medium" (1200px)
        
        Returns:
            Thumbnail key (e.g., memories/user123/20240101_abc_thumb.webp)
        """
        import os
        base, _ = os.path.splitext(s3_key)
        return f"{base}_{size}.webp"
    
    def get_thumb_url(self, s3_key: str) -> str:
        """Get the URL for the thumbnail (300px) version."""
        thumb_key = self.get_thumbnail_key(s3_key, "thumb")
        return self._get_url(thumb_key)
    
    def get_medium_url(self, s3_key: str) -> str:
        """Get the URL for the medium (1200px) version."""
        medium_key = self.get_thumbnail_key(s3_key, "medium")
        return self._get_url(medium_key)

    def delete_photo(self, s3_key: str) -> bool:
        """
        Delete a photo from S3.
        
        Args:
            s3_key: The S3 key of the photo to delete
            
        Returns:
            bool: True if deleted successfully
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key,
            )
            return True
        except ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete photo: {str(e)}",
            )


# Singleton instance
s3_service = S3Service()

