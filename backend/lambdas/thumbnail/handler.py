"""
Thumbnail Generator Lambda

Triggered by S3 uploads, generates multiple thumbnail sizes:
- thumb: 300px wide (for grid views)
- medium: 1200px wide (for detail views)
- original: preserved as-is

Output format: WebP (30% smaller than JPEG)
"""

import json
import logging
import os
import boto3
from io import BytesIO
from urllib.parse import unquote_plus

# Pillow for image processing
from PIL import Image

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# S3 client
s3_client = boto3.client('s3')

# Thumbnail sizes (width in pixels)
SIZES = {
    'thumb': 300,
    'medium': 1200,
}

# WebP quality (90 = visually lossless)
WEBP_QUALITY = 90


def handler(event, context):
    """
    Lambda handler for S3 trigger.
    
    Generates thumbnails for uploaded images and stores them
    alongside the original with size suffix.
    
    Example:
        Original: memories/user123/20240101_abc123.jpg
        Thumb:    memories/user123/20240101_abc123_thumb.webp
        Medium:   memories/user123/20240101_abc123_medium.webp
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Process each record (S3 event)
    for record in event.get('Records', []):
        try:
            process_record(record)
        except Exception as e:
            logger.error(f"Error processing record: {e}", exc_info=True)
            # Don't raise - continue processing other records
    
    return {
        'statusCode': 200,
        'body': json.dumps('Thumbnails generated successfully')
    }


def process_record(record):
    """Process a single S3 event record."""
    # Get bucket and key from event
    bucket = record['s3']['bucket']['name']
    key = unquote_plus(record['s3']['object']['key'])
    
    logger.info(f"Processing: s3://{bucket}/{key}")
    
    # Skip if this is already a thumbnail (prevent infinite loop)
    if '_thumb.' in key or '_medium.' in key:
        logger.info(f"Skipping thumbnail file: {key}")
        return
    
    # Skip non-image files
    if not is_image_file(key):
        logger.info(f"Skipping non-image file: {key}")
        return
    
    # Download the original image
    response = s3_client.get_object(Bucket=bucket, Key=key)
    image_data = response['Body'].read()
    content_type = response.get('ContentType', 'image/jpeg')
    
    logger.info(f"Downloaded image: {len(image_data)} bytes, type: {content_type}")
    
    # Open image with Pillow
    try:
        image = Image.open(BytesIO(image_data))
    except Exception as e:
        logger.error(f"Failed to open image: {e}")
        return
    
    # Convert to RGB if necessary (for PNG with transparency, etc.)
    if image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')
    
    # Get original dimensions
    original_width, original_height = image.size
    logger.info(f"Original dimensions: {original_width}x{original_height}")
    
    # Generate thumbnails for each size
    for size_name, target_width in SIZES.items():
        # Skip if original is smaller than target
        if original_width <= target_width:
            logger.info(f"Skipping {size_name}: original ({original_width}px) <= target ({target_width}px)")
            continue
        
        # Calculate new height maintaining aspect ratio
        ratio = target_width / original_width
        target_height = int(original_height * ratio)
        
        # Resize image
        resized = image.copy()
        resized.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        
        logger.info(f"Generated {size_name}: {resized.size[0]}x{resized.size[1]}")
        
        # Save to WebP format
        output_buffer = BytesIO()
        resized.save(output_buffer, format='WEBP', quality=WEBP_QUALITY)
        output_buffer.seek(0)
        
        # Generate output key
        output_key = generate_thumbnail_key(key, size_name)
        
        # Upload to S3
        s3_client.put_object(
            Bucket=bucket,
            Key=output_key,
            Body=output_buffer.getvalue(),
            ContentType='image/webp',
        )
        
        logger.info(f"Uploaded: s3://{bucket}/{output_key} ({len(output_buffer.getvalue())} bytes)")


def is_image_file(key: str) -> bool:
    """Check if the file is an image based on extension."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'}
    ext = os.path.splitext(key.lower())[1]
    return ext in image_extensions


def generate_thumbnail_key(original_key: str, size_name: str) -> str:
    """
    Generate the S3 key for a thumbnail.
    
    Example:
        Input:  memories/user123/20240101_abc123.jpg
        Output: memories/user123/20240101_abc123_thumb.webp
    """
    # Split into base and extension
    base, _ = os.path.splitext(original_key)
    return f"{base}_{size_name}.webp"

