"""add vector search support

Revision ID: a1b2c3d4e5f6
Revises: 399af4ce14f2
Create Date: 2026-01-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '399af4ce14f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension (requires RDS to have it available)
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Add GIN indexes for faster keyword search on existing AI fields
    # These improve LIKE/ILIKE and JSON containment queries
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_photos_ai_labels_gin 
        ON photos USING GIN (ai_labels jsonb_path_ops)
    ''')
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_photos_ai_description_gin 
        ON photos USING GIN (to_tsvector('english', COALESCE(ai_description, '')))
    ''')
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_memories_ai_labels_gin 
        ON memories USING GIN (ai_labels jsonb_path_ops)
    ''')
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_memories_ai_description_gin 
        ON memories USING GIN (to_tsvector('english', COALESCE(ai_description, '')))
    ''')
    
    # Add embedding columns for vector search (Titan Embeddings uses 1024 dimensions)
    op.add_column('photos', sa.Column('embedding', Vector(1024), nullable=True))
    op.add_column('memories', sa.Column('embedding', Vector(1024), nullable=True))
    
    # Add vector indexes for similarity search
    # Using HNSW index (better query performance than ivfflat, slightly slower builds)
    # cosine distance is best for normalized embeddings
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_photos_embedding_hnsw 
        ON photos USING hnsw (embedding vector_cosine_ops)
    ''')
    op.execute('''
        CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw 
        ON memories USING hnsw (embedding vector_cosine_ops)
    ''')


def downgrade() -> None:
    # Drop vector indexes
    op.execute('DROP INDEX IF EXISTS idx_photos_embedding_hnsw')
    op.execute('DROP INDEX IF EXISTS idx_memories_embedding_hnsw')
    
    # Drop embedding columns
    op.drop_column('photos', 'embedding')
    op.drop_column('memories', 'embedding')
    
    # Drop GIN indexes
    op.execute('DROP INDEX IF EXISTS idx_photos_ai_labels_gin')
    op.execute('DROP INDEX IF EXISTS idx_photos_ai_description_gin')
    op.execute('DROP INDEX IF EXISTS idx_memories_ai_labels_gin')
    op.execute('DROP INDEX IF EXISTS idx_memories_ai_description_gin')
    
    # Note: We don't drop the pgvector extension as other things might depend on it
