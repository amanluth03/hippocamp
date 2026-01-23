#!/usr/bin/env python3
"""
Embeddings Backfill Script

Generates vector embeddings for photos and memories that have AI labels
but no embeddings yet. Uses AWS Bedrock Titan Embeddings.

Usage:
    # Dry run (see what would be processed):
    python scripts/backfill_embeddings.py --dry-run

    # Process all items needing embeddings:
    python scripts/backfill_embeddings.py

    # Process only first 10 items:
    python scripts/backfill_embeddings.py --limit 10

Requirements:
    - DATABASE_URL environment variable pointing to production database
    - AWS credentials configured (for Bedrock access)
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

from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker

# Import models and services (after setting env vars)
from app.models.photo import Photo
from app.models.memory import Memory
from app.services.embeddings import EmbeddingsService

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Rate limiting to avoid Bedrock throttling
DELAY_BETWEEN_REQUESTS = 0.2  # seconds (embeddings are faster than image analysis)


def process_item(embeddings_service, labels: list, description: str, dry_run: bool = False) -> dict:
    """Generate embedding for a single photo/memory.
    
    Returns:
        dict with 'status', 'embedding', 'error'
    """
    result = {
        'status': 'processed',
        'embedding': None,
        'error': None,
    }
    
    if dry_run:
        result['status'] = 'would process'
        return result
    
    # Generate embedding
    try:
        embedding_result = embeddings_service.generate_embedding_for_photo(labels, description)
        
        if embedding_result.error:
            result['status'] = 'error'
            result['error'] = embedding_result.error
        elif embedding_result.embedding:
            result['embedding'] = embedding_result.embedding
            result['status'] = 'success'
        else:
            result['status'] = 'error'
            result['error'] = 'No embedding returned'
            
    except Exception as e:
        result['status'] = 'error'
        result['error'] = f'Embedding generation failed: {str(e)}'
    
    return result


def main():
    parser = argparse.ArgumentParser(description='Backfill embeddings for existing photos')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be done without making changes')
    parser.add_argument('--limit', type=int, default=0,
                        help='Limit number of items to process (0 = no limit)')
    parser.add_argument('--photos-only', action='store_true',
                        help='Only process photos (not memories)')
    parser.add_argument('--memories-only', action='store_true',
                        help='Only process memories (not photos)')
    args = parser.parse_args()
    
    print(f"🦛 Hippo Campus Embeddings Backfill")
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
    print()
    
    # Initialize services
    print("🔧 Initializing services...")
    
    embeddings_service = EmbeddingsService()
    
    if not embeddings_service.enabled:
        print("❌ ERROR: Embeddings service failed to initialize")
        print("   Make sure BEDROCK_ENABLED=true and AWS credentials are configured")
        sys.exit(1)
    
    print(f"   Embeddings model: {embeddings_service.MODEL_ID}")
    
    # Connect to database
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    print("   ✅ Connected to database")
    print()
    
    # Collect items to process (have AI labels but no embedding)
    items_to_process = []
    
    if not args.memories_only:
        # Get photos with AI labels but no embedding
        photos = db.query(Photo).filter(
            Photo.ai_labels.isnot(None),
            Photo.embedding.is_(None)
        ).all()
        
        for photo in photos:
            items_to_process.append({
                'type': 'photo',
                'id': photo.id,
                'labels': photo.ai_labels or [],
                'description': photo.ai_description or '',
                'model': photo,
            })
        
        print(f"📸 Found {len(photos)} photos needing embeddings")
    
    if not args.photos_only:
        # Get memories with AI labels but no embedding
        memories = db.query(Memory).filter(
            Memory.ai_labels.isnot(None),
            Memory.embedding.is_(None)
        ).all()
        
        for memory in memories:
            items_to_process.append({
                'type': 'memory',
                'id': memory.id,
                'labels': memory.ai_labels or [],
                'description': memory.ai_description or '',
                'model': memory,
            })
        
        print(f"✨ Found {len(memories)} memories needing embeddings")
    
    print(f"📋 Total items to process: {len(items_to_process)}")
    print()
    
    if not items_to_process:
        print("✅ Nothing to process! All items have embeddings.")
        return
    
    if args.limit > 0:
        items_to_process = items_to_process[:args.limit]
        print(f"⚠️  Processing only first {args.limit} items")
        print()
    
    # Process items
    stats = {
        'processed': 0,
        'errors': 0,
    }
    
    for i, item in enumerate(items_to_process, 1):
        print(f"[{i}/{len(items_to_process)}] {item['type']} {str(item['id'])[:8]}... ", end='', flush=True)
        
        result = process_item(
            embeddings_service, 
            item['labels'], 
            item['description'], 
            dry_run=args.dry_run
        )
        
        if result['status'] == 'error':
            stats['errors'] += 1
            print(f"❌ {result['error']}")
        elif result['status'] == 'would process':
            print(f"⏳ would process ({len(item['labels'])} labels)")
        else:
            stats['processed'] += 1
            
            # Update database
            item['model'].embedding = result['embedding']
            
            print(f"✅ generated ({len(result['embedding'])} dimensions)")
        
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
    
    if args.dry_run:
        print()
        print("⚠️  This was a dry run. No changes were made.")
        print("   Run without --dry-run to process items.")


if __name__ == '__main__':
    main()
