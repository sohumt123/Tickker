"""initial tables

Revision ID: 20250807_01_initial
Revises: 
Create Date: 2025-08-07 00:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250807_01_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, index=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('date', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('symbol', sa.String(), nullable=True),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
    )

    op.create_table(
        'portfolio_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('date', sa.String(), nullable=False),
        sa.Column('total_value', sa.Float(), nullable=False),
        sa.Column('spy_price', sa.Float(), nullable=True),
        sa.Column('positions_json', sa.Text(), nullable=False, server_default='[]'),
    )


def downgrade() -> None:
    op.drop_table('portfolio_history')
    op.drop_table('transactions')
    op.drop_table('users')


