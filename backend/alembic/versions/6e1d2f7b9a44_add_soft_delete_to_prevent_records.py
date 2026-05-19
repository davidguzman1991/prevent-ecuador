"""add soft delete to prevent records

Revision ID: 6e1d2f7b9a44
Revises: 3c4f8d9a7b21
Create Date: 2026-05-19 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "6e1d2f7b9a44"
down_revision: Union[str, None] = "3c4f8d9a7b21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "prevent_records",
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("prevent_records", "deleted_at", schema="public")
    op.drop_column("prevent_records", "is_deleted", schema="public")
