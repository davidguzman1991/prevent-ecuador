"""add patient social determinants

Revision ID: e6b9c1d4a8f2
Revises: d4f3a9c8e2b7
Create Date: 2026-05-30 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e6b9c1d4a8f2"
down_revision: Union[str, None] = "d4f3a9c8e2b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "prevent_records",
        sa.Column("patient_health_coverage", sa.String(length=30), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_education_level", sa.String(length=30), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_employment_status", sa.String(length=30), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_ethnicity", sa.String(length=30), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("patient_socioeconomic_level", sa.String(length=30), nullable=True),
        schema="public",
    )

    op.create_check_constraint(
        "ck_prevent_records_patient_health_coverage",
        "prevent_records",
        (
            "patient_health_coverage IS NULL OR patient_health_coverage IN "
            "('iess', 'msp', 'private', 'issfa', 'isspol', 'none', 'unknown')"
        ),
        schema="public",
    )
    op.create_check_constraint(
        "ck_prevent_records_patient_education_level",
        "prevent_records",
        (
            "patient_education_level IS NULL OR patient_education_level IN "
            "('no_schooling', 'primary', 'secondary', 'higher', 'postgraduate', 'unknown')"
        ),
        schema="public",
    )
    op.create_check_constraint(
        "ck_prevent_records_patient_employment_status",
        "prevent_records",
        (
            "patient_employment_status IS NULL OR patient_employment_status IN "
            "('employed', 'self_employed', 'unemployed', 'retired', "
            "'homemaker', 'student', 'other', 'unknown')"
        ),
        schema="public",
    )
    op.create_check_constraint(
        "ck_prevent_records_patient_ethnicity",
        "prevent_records",
        (
            "patient_ethnicity IS NULL OR patient_ethnicity IN "
            "('mestizo', 'montubio', 'afro_ecuadorian', 'indigenous', "
            "'white', 'other', 'unknown')"
        ),
        schema="public",
    )
    op.create_check_constraint(
        "ck_prevent_records_patient_socioeconomic_level",
        "prevent_records",
        (
            "patient_socioeconomic_level IS NULL OR patient_socioeconomic_level IN "
            "('low', 'middle', 'high', 'prefer_not_to_answer')"
        ),
        schema="public",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_prevent_records_patient_socioeconomic_level",
        "prevent_records",
        schema="public",
        type_="check",
    )
    op.drop_constraint(
        "ck_prevent_records_patient_ethnicity",
        "prevent_records",
        schema="public",
        type_="check",
    )
    op.drop_constraint(
        "ck_prevent_records_patient_employment_status",
        "prevent_records",
        schema="public",
        type_="check",
    )
    op.drop_constraint(
        "ck_prevent_records_patient_education_level",
        "prevent_records",
        schema="public",
        type_="check",
    )
    op.drop_constraint(
        "ck_prevent_records_patient_health_coverage",
        "prevent_records",
        schema="public",
        type_="check",
    )
    op.drop_column("prevent_records", "patient_socioeconomic_level", schema="public")
    op.drop_column("prevent_records", "patient_ethnicity", schema="public")
    op.drop_column("prevent_records", "patient_employment_status", schema="public")
    op.drop_column("prevent_records", "patient_education_level", schema="public")
    op.drop_column("prevent_records", "patient_health_coverage", schema="public")
