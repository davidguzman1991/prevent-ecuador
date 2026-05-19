"""store prevent age as float

Revision ID: 3c4f8d9a7b21
Revises: 8f8f92b3a2d1
Create Date: 2026-05-19 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "3c4f8d9a7b21"
down_revision: Union[str, None] = "8f8f92b3a2d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "prevent_records",
        "prevent_age",
        existing_type=sa.Integer(),
        type_=sa.Float(),
        existing_nullable=True,
        schema="public",
    )


def downgrade() -> None:
    op.alter_column(
        "prevent_records",
        "prevent_age",
        existing_type=sa.Float(),
        type_=sa.Integer(),
        existing_nullable=True,
        schema="public",
    )
