"""add apple_id to users and make google_id nullable

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('apple_id', sa.String(255), nullable=True))
    op.create_index('ix_users_apple_id', 'users', ['apple_id'], unique=True)
    op.alter_column('users', 'google_id', existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'google_id', existing_type=sa.String(255), nullable=False)
    op.drop_index('ix_users_apple_id', table_name='users')
    op.drop_column('users', 'apple_id')
