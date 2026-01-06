#!/usr/bin/env python3
"""
Thumbnail Backfill Script

One-time script to generate thumbnails for all existing photos
that were uploaded before the thumbnail Lambda was deployed.

Usage:
    python scripts/backfill_thumbnails.py

Requirements:
    - AWS CLI configured with credentials
    - Pillow installed: pip install Pillow boto3
"""

import os
import sys
import boto3
from io import BytesIO
from PIL import Image
import argparse

# Configuration
BUCKET_NAME = "hippocamp-photos-prod"
REGION = "us-east-1"

# Same settings as the Lambda
SIZES = {
    'thumb': 300,
    'medium': 1200,
}
WEBP_QUALITY = 90

# Image extensions to process
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'}


def get_s3_client():
    """Create S3 client using default credentials."""
    return boto3.client('s3', region_name=REGION)


def is_image_file(key: str) -> bool:
    """Check if the file is an image based on extension."""
    ext = os.path.splitext(key.lower())[1]
    return ext in IMAGE_EXTENSIONS


def is_original_image(key: str) -> bool:
    """Check if this is an original image (not a thumbnail)."""
    return '_thumb.' not in key and '_medium.' not in key


def get_thumbnail_key(original_key: str, size_name: str) -> str:
    """Generate the S3 key for a thumbnail."""
    base, _ = os.path.splitext(original_key)
    return f"{base}_{size_name}.webp"


def thumbnail_exists(s3_client, bucket: str, key: str) -> bool:
    """Check if a file exists in S3."""
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except:
        return False


def process_image(s3_client, bucket: str, key: str, dry_run: bool = False) -> dict:
    """Process a single image and generate thumbnails.
    
    Returns:
        dict with 'status', 'thumb_created', 'medium_created'
    """
    result = {
        'status': 'processed',
        'thumb_created': False,
        'medium_created': False,
    }
    
    # Check if thumbnails already exist
    thumb_key = get_thumbnail_key(key, 'thumb')
    medium_key = get_thumbnail_key(key, 'medium')
    
    thumb_exists = thumbnail_exists(s3_client, bucket, thumb_key)
    medium_exists = thumbnail_exists(s3_client, bucket, medium_key)
    
    if thumb_exists and medium_exists:
        result['status'] = 'skipped (thumbnails exist)'
        return result
    
    if dry_run:
        result['status'] = 'would process'
        result['thumb_created'] = not thumb_exists
        result['medium_created'] = not medium_exists
        return result
    
    # Download the original image
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_data = response['Body'].read()
    except Exception as e:
        result['status'] = f'error downloading: {e}'
        return result
    
    # Open image with Pillow
    try:
        image = Image.open(BytesIO(image_data))
    except Exception as e:
        result['status'] = f'error opening: {e}'
        return result
    
    # Convert to RGB if necessary
    if image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')
    
    original_width, original_height = image.size
    
    # Generate thumbnails
    for size_name, target_width in SIZES.items():
        output_key = get_thumbnail_key(key, size_name)
        
        # Skip if already exists
        if (size_name == 'thumb' and thumb_exists) or (size_name == 'medium' and medium_exists):
            continue
        
        # Skip if original is smaller than target
        if original_width <= target_width:
            continue
        
        # Calculate new height maintaining aspect ratio
        ratio = target_width / original_width
        target_height = int(original_height * ratio)
        
        # Resize image
        resized = image.copy()
        resized.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Save to WebP format
        output_buffer = BytesIO()
        resized.save(output_buffer, format='WEBP', quality=WEBP_QUALITY)
        output_buffer.seek(0)
        
        # Upload to S3
        try:
            s3_client.put_object(
                Bucket=bucket,
                Key=output_key,
                Body=output_buffer.getvalue(),
                ContentType='image/webp',
            )
            
            if size_name == 'thumb':
                result['thumb_created'] = True
            else:
                result['medium_created'] = True
                
        except Exception as e:
            result['status'] = f'error uploading {size_name}: {e}'
            return result
    
    return result


def list_all_images(s3_client, bucket: str):
    """List all original images in the bucket."""
    images = []
    prefixes = ['events/', 'memories/']
    
    for prefix in prefixes:
        paginator = s3_client.get_paginator('list_objects_v2')
        
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get('Contents', []):
                key = obj['Key']
                if is_image_file(key) and is_original_image(key):
                    images.append(key)
    
    return images


def main():
    parser = argparse.ArgumentParser(description='Backfill thumbnails for existing photos')
    parser.add_argument('--dry-run', action='store_true', 
                        help='Show what would be done without making changes')
    parser.add_argument('--bucket', default=BUCKET_NAME,
                        help=f'S3 bucket name (default: {BUCKET_NAME})')
    parser.add_argument('--limit', type=int, default=0,
                        help='Limit number of images to process (0 = no limit)')
    args = parser.parse_args()
    
    print(f"🦛 Hippo Campus Thumbnail Backfill")
    print(f"=" * 50)
    print(f"Bucket: {args.bucket}")
    print(f"Dry run: {args.dry_run}")
    print()
    
    s3_client = get_s3_client()
    
    # List all images
    print("📸 Scanning for images...")
    images = list_all_images(s3_client, args.bucket)
    print(f"   Found {len(images)} original images")
    print()
    
    if args.limit > 0:
        images = images[:args.limit]
        print(f"   Processing first {args.limit} images only")
        print()
    
    # Process each image
    stats = {
        'processed': 0,
        'skipped': 0,
        'errors': 0,
        'thumbs_created': 0,
        'mediums_created': 0,
    }
    
    for i, key in enumerate(images, 1):
        print(f"[{i}/{len(images)}] {key[:60]}...")
        
        result = process_image(s3_client, args.bucket, key, dry_run=args.dry_run)
        
        if 'error' in result['status']:
            stats['errors'] += 1
            print(f"         ❌ {result['status']}")
        elif 'skipped' in result['status']:
            stats['skipped'] += 1
            print(f"         ⏭️  Skipped (already has thumbnails)")
        else:
            stats['processed'] += 1
            if result['thumb_created']:
                stats['thumbs_created'] += 1
            if result['medium_created']:
                stats['mediums_created'] += 1
            print(f"         ✅ Created: thumb={result['thumb_created']}, medium={result['medium_created']}")
    
    # Summary
    print()
    print(f"=" * 50)
    print(f"📊 Summary:")
    print(f"   Total images:     {len(images)}")
    print(f"   Processed:        {stats['processed']}")
    print(f"   Skipped:          {stats['skipped']}")
    print(f"   Errors:           {stats['errors']}")
    print(f"   Thumbs created:   {stats['thumbs_created']}")
    print(f"   Mediums created:  {stats['mediums_created']}")
    
    if args.dry_run:
        print()
        print("⚠️  This was a dry run. No changes were made.")
        print("   Run without --dry-run to generate thumbnails.")


if __name__ == '__main__':
    main()

