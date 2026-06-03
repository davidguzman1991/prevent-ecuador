"""add doctor profile fields

Revision ID: 9b2d5c7e1a34
Revises: f2c9e7a1b5d0
Create Date: 2026-06-01 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "9b2d5c7e1a34"
down_revision: Union[str, None] = "f2c9e7a1b5d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("doctors", sa.Column("phone", sa.String(length=40), nullable=True), schema="public")
    op.add_column("doctors", sa.Column("birth_date", sa.Date(), nullable=True), schema="public")
    op.add_column("doctors", sa.Column("province_code", sa.String(length=20), nullable=True), schema="public")
    op.add_column("doctors", sa.Column("province_name", sa.String(length=100), nullable=True), schema="public")


def downgrade() -> None:
    op.drop_column("doctors", "province_name", schema="public")
    op.drop_column("doctors", "province_code", schema="public")
    op.drop_column("doctors", "birth_date", schema="public")
    op.drop_column("doctors", "phone", schema="public")
