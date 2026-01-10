#!/usr/bin/env python3
"""
AI Labels Backfill Script

Processes existing photos and memories through AWS Bedrock to generate
AI labels and descriptions for search functionality.

Usage:
    # Dry run (see what would be processed):
    python scripts/backfill_ai_labels.py --dry-run

    # Process all untagged photos:
    python scripts/backfill_ai_labels.py

    # Process only first 10 photos:
    python scripts/backfill_ai_labels.py --limit 10

Requirements:
    - DATABASE_URL environment variable pointing to production database
    - AWS credentials configured (for S3 and Bedrock access)
    - BEDROCK_ENABLED=true environment variable
"""

import os
import sys
import time
import argparse
from datetime import datetime

# Force enable Bedrock BEFORE importing the service
os.environ['BEDROCK_ENABLED'] = 'true'

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import boto3
from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker

# Import models and services (after setting env vars)
from app.models.photo import Photo
from app.models.memory import Memory
from app.services.bedrock import BedrockService

# Configuration
BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "hippocamp-photos-prod")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
DATABASE_URL = os.getenv("DATABASE_URL")

# Rate limiting to avoid Bedrock throttling
DELAY_BETWEEN_REQUESTS = 0.5  # seconds


def get_media_type(s3_key: str) -> str:
    """Get media type from S3 key extension."""
    ext = os.path.splitext(s3_key.lower())[1]
    media_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
        '.heif': 'image/heif',
    }
    return media_types.get(ext, 'image/jpeg')


def process_item(s3_client, bedrock_service, bucket: str, s3_key: str, dry_run: bool = False) -> dict:
    """Process a single photo/memory through Bedrock.
    
    Returns:
        dict with 'status', 'labels', 'description'
    """
    result = {
        'status': 'processed',
        'labels': [],
        'description': '',
        'error': None,
    }
    
    if dry_run:
        result['status'] = 'would process'
        return result
    
    # Download image from S3
    try:
        response = s3_client.get_object(Bucket=bucket, Key=s3_key)
        image_bytes = response['Body'].read()
    except Exception as e:
        result['status'] = 'error'
        result['error'] = f'S3 download failed: {str(e)}'
        return result
    
    # Get media type
    media_type = get_media_type(s3_key)
    
    # Analyze with Bedrock
    try:
        analysis = bedrock_service.analyze_image(image_bytes, media_type)
        
        if analysis.error:
            result['status'] = 'error'
            result['error'] = analysis.error
        else:
            result['labels'] = analysis.labels
            result['description'] = analysis.description
            result['status'] = 'success'
            
    except Exception as e:
        result['status'] = 'error'
        result['error'] = f'Bedrock analysis failed: {str(e)}'
    
    return result


def main():
    parser = argparse.ArgumentParser(description='Backfill AI labels for existing photos')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be done without making changes')
    parser.add_argument('--limit', type=int, default=0,
                        help='Limit number of items to process (0 = no limit)')
    parser.add_argument('--photos-only', action='store_true',
                        help='Only process photos (not memories)')
    parser.add_argument('--memories-only', action='store_true',
                        help='Only process memories (not photos)')
    args = parser.parse_args()
    
    print(f"🦛 Hippo Campus AI Labels Backfill")
    print(f"=" * 50)
    print(f"Dry run: {args.dry_run}")
    print()
    
    # Check required environment variables
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL environment variable is required")
        print("   Set it to your production database connection string:")
        print("   export DATABASE_URL='postgresql://user:pass@host:5432/dbname'")
        sys.exit(1)
    
    # Mask password in output
    safe_url = DATABASE_URL
    if '@' in DATABASE_URL:
        parts = DATABASE_URL.split('@')
        safe_url = parts[0].split(':')[0] + ':****@' + parts[1]
    print(f"Database: {safe_url}")
    print(f"S3 Bucket: {BUCKET_NAME}")
    print()
    
    # Initialize services
    print("🔧 Initializing services...")
    
    bedrock_service = BedrockService()
    
    if not bedrock_service.enabled:
        print("❌ ERROR: Bedrock service failed to initialize")
        sys.exit(1)
    
    print(f"   Bedrock model: {bedrock_service.model_id}")
    
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    
    # Connect to database
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    print("   ✅ Connected to database")
    print()
    
    # Collect items to process
    items_to_process = []
    
    if not args.memories_only:
        # Get photos without AI labels
        photos = db.query(Photo).filter(
            Photo.ai_labels.is_(None)
        ).all()
        
        for photo in photos:
            items_to_process.append({
                'type': 'photo',
                'id': photo.id,
                's3_key': photo.s3_key,
                'model': photo,
            })
        
        print(f"📸 Found {len(photos)} photos without AI labels")
    
    if not args.photos_only:
        # Get memories without AI labels
        memories = db.query(Memory).filter(
            Memory.ai_labels.is_(None)
        ).all()
        
        for memory in memories:
            items_to_process.append({
                'type': 'memory',
                'id': memory.id,
                's3_key': memory.s3_key,
                'model': memory,
            })
        
        print(f"✨ Found {len(memories)} memories without AI labels")
    
    print(f"📋 Total items to process: {len(items_to_process)}")
    print()
    
    if not items_to_process:
        print("✅ Nothing to process! All items have AI labels.")
        return
    
    if args.limit > 0:
        items_to_process = items_to_process[:args.limit]
        print(f"⚠️  Processing only first {args.limit} items")
        print()
    
    # Process items
    stats = {
        'processed': 0,
        'errors': 0,
        'total_labels': 0,
    }
    
    for i, item in enumerate(items_to_process, 1):
        print(f"[{i}/{len(items_to_process)}] {item['type']} {str(item['id'])[:8]}... ", end='', flush=True)
        
        result = process_item(s3_client, bedrock_service, BUCKET_NAME, item['s3_key'], dry_run=args.dry_run)
        
        if result['status'] == 'error':
            stats['errors'] += 1
            print(f"❌ {result['error']}")
        elif result['status'] == 'would process':
            print("⏳ would process")
        else:
            stats['processed'] += 1
            stats['total_labels'] += len(result['labels'])
            
            # Update database
            item['model'].ai_labels = result['labels']
            item['model'].ai_description = result['description']
            item['model'].ai_processed_at = datetime.utcnow()
            item['model'].ai_error = None
            
            print(f"✅ {len(result['labels'])} labels")
        
        # Rate limiting
        if not args.dry_run and i < len(items_to_process):
            time.sleep(DELAY_BETWEEN_REQUESTS)
    
    # Commit changes
    if not args.dry_run and stats['processed'] > 0:
        print()
        print("💾 Saving to database...")
        db.commit()
        print("   ✅ Done!")
    
    db.close()
    
    # Summary
    print()
    print(f"=" * 50)
    print(f"📊 Summary:")
    print(f"   Total items:      {len(items_to_process)}")
    print(f"   Processed:        {stats['processed']}")
    print(f"   Errors:           {stats['errors']}")
    print(f"   Labels generated: {stats['total_labels']}")
    
    if args.dry_run:
        print()
        print("⚠️  This was a dry run. No changes were made.")
        print("   Run without --dry-run to process items.")


if __name__ == '__main__':
    main()
