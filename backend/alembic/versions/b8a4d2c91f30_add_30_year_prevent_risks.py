"""add 30 year prevent risks

Revision ID: b8a4d2c91f30
Revises: 6e1d2f7b9a44
Create Date: 2026-05-29 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b8a4d2c91f30"
down_revision: Union[str, None] = "6e1d2f7b9a44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "prevent_records",
        sa.Column("cvd_risk_30y", sa.Float(), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("ascvd_risk_30y", sa.Float(), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("hf_risk_30y", sa.Float(), nullable=True),
        schema="public",
    )

    op.execute(
        """
        UPDATE public.prevent_records
        SET
            cvd_risk_30y = COALESCE(
                cvd_risk_30y,
                CASE
                    WHEN jsonb_typeof(input_payload_json->'results') = 'object'
                        AND input_payload_json->'results'->>'cvd_30y' IS NOT NULL
                    THEN (input_payload_json->'results'->>'cvd_30y')::double precision
                END
            ),
            ascvd_risk_30y = COALESCE(
                ascvd_risk_30y,
                CASE
                    WHEN jsonb_typeof(input_payload_json->'results') = 'object'
                        AND input_payload_json->'results'->>'ascvd_30y' IS NOT NULL
                    THEN (input_payload_json->'results'->>'ascvd_30y')::double precision
                END
            ),
            hf_risk_30y = COALESCE(
                hf_risk_30y,
                CASE
                    WHEN jsonb_typeof(input_payload_json->'results') = 'object'
                        AND input_payload_json->'results'->>'hf_30y' IS NOT NULL
                    THEN (input_payload_json->'results'->>'hf_30y')::double precision
                END
            )
        """
    )


def downgrade() -> None:
    op.drop_column("prevent_records", "hf_risk_30y", schema="public")
    op.drop_column("prevent_records", "ascvd_risk_30y", schema="public")
    op.drop_column("prevent_records", "cvd_risk_30y", schema="public")
