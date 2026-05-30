"""add normalized patient geography

Revision ID: d4f3a9c8e2b7
Revises: b8a4d2c91f30
Create Date: 2026-05-30 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d4f3a9c8e2b7"
down_revision: Union[str, None] = "b8a4d2c91f30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "prevent_records",
        sa.Column("patient_province_code", sa.String(length=20), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_province_name", sa.String(length=100), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_canton_code", sa.String(length=20), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_canton_name", sa.String(length=100), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_area_type", sa.String(length=20), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_geo_source", sa.String(length=30), nullable=True),
        schema="public",
    )

    op.create_check_constraint(
        "ck_prevent_records_patient_area_type",
        "prevent_records",
        "patient_area_type IS NULL OR patient_area_type IN ('urban', 'rural', 'unknown')",
        schema="public",
    )
    op.create_check_constraint(
        "ck_prevent_records_patient_geo_source",
        "prevent_records",
        (
            "patient_geo_source IS NULL OR patient_geo_source IN "
            "('self_reported', 'clinic_assigned', 'imported', 'unknown')"
        ),
        schema="public",
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_prevent_records_patient_province_code "
        "ON public.prevent_records (patient_province_code)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_prevent_records_patient_canton_code "
        "ON public.prevent_records (patient_canton_code)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_prevent_records_patient_area_type "
        "ON public.prevent_records (patient_area_type)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_prevent_records_created_at "
        "ON public.prevent_records (created_at)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS public.ix_prevent_records_created_at")
    op.execute("DROP INDEX IF EXISTS public.ix_prevent_records_patient_area_type")
    op.execute("DROP INDEX IF EXISTS public.ix_prevent_records_patient_canton_code")
    op.execute("DROP INDEX IF EXISTS public.ix_prevent_records_patient_province_code")
    op.drop_constraint(
        "ck_prevent_records_patient_geo_source",
        "prevent_records",
        schema="public",
        type_="check",
    )
    op.drop_constraint(
        "ck_prevent_records_patient_area_type",
        "prevent_records",
        schema="public",
        type_="check",
    )
    op.drop_column("prevent_records", "patient_geo_source", schema="public")
    op.drop_column("prevent_records", "patient_area_type", schema="public")
    op.drop_column("prevent_records", "patient_canton_name", schema="public")
    op.drop_column("prevent_records", "patient_canton_code", schema="public")
    op.drop_column("prevent_records", "patient_province_name", schema="public")
    op.drop_column("prevent_records", "patient_province_code", schema="public")
