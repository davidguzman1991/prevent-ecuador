"""add structured analytics columns to prevent_records

Revision ID: 8f8f92b3a2d1
Revises: a1b97dee88c0
Create Date: 2026-03-29 09:25:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8f8f92b3a2d1"
down_revision = "a1b97dee88c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "prevent_records",
        sa.Column("uacr", sa.Float(), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("hba1c", sa.Float(), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("sdi", sa.Integer(), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("model_variant_used", sa.String(length=50), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("cvd_risk_10y", sa.Float(), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("ascvd_risk_10y", sa.Float(), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("hf_risk_10y", sa.Float(), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("cvd_category", sa.String(length=50), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("ascvd_category", sa.String(length=50), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("hf_category", sa.String(length=50), nullable=True),
        schema="public",
    )
    op.add_column(
        "prevent_records",
        sa.Column("prevent_age", sa.Integer(), nullable=True),
        schema="public",
    )

    op.execute(
        """
        UPDATE public.prevent_records
        SET
            uacr = COALESCE(
                uacr,
                CASE
                    WHEN input_payload_json ? 'uacr'
                        AND input_payload_json->>'uacr' IS NOT NULL
                    THEN (input_payload_json->>'uacr')::double precision
                    ELSE NULL
                END
            ),
            hba1c = COALESCE(
                hba1c,
                CASE
                    WHEN input_payload_json ? 'hba1c'
                        AND input_payload_json->>'hba1c' IS NOT NULL
                    THEN (input_payload_json->>'hba1c')::double precision
                    ELSE NULL
                END
            ),
            sdi = COALESCE(
                sdi,
                CASE
                    WHEN input_payload_json ? 'sdi'
                        AND input_payload_json->>'sdi' IS NOT NULL
                    THEN (input_payload_json->>'sdi')::integer
                    ELSE NULL
                END
            ),
            model_variant_used = COALESCE(
                model_variant_used,
                input_payload_json->>'model_variant'
            ),
            cvd_risk_10y = COALESCE(
                cvd_risk_10y,
                CASE
                    WHEN input_payload_json ? 'results'
                        AND input_payload_json->'results'->>'cvd_10y' IS NOT NULL
                    THEN (input_payload_json->'results'->>'cvd_10y')::double precision
                    WHEN risk_10y IS NOT NULL
                    THEN risk_10y * 100
                    ELSE NULL
                END
            ),
            ascvd_risk_10y = COALESCE(
                ascvd_risk_10y,
                CASE
                    WHEN input_payload_json ? 'results'
                        AND input_payload_json->'results'->>'ascvd_10y' IS NOT NULL
                    THEN (input_payload_json->'results'->>'ascvd_10y')::double precision
                    ELSE NULL
                END
            ),
            hf_risk_10y = COALESCE(
                hf_risk_10y,
                CASE
                    WHEN input_payload_json ? 'results'
                        AND input_payload_json->'results'->>'hf_10y' IS NOT NULL
                    THEN (input_payload_json->'results'->>'hf_10y')::double precision
                    ELSE NULL
                END
            ),
            cvd_category = COALESCE(cvd_category, risk_category),
            prevent_age = COALESCE(
                prevent_age,
                CASE
                    WHEN input_payload_json ? 'results'
                        AND input_payload_json->'results'->>'prevent_age' IS NOT NULL
                    THEN ROUND((input_payload_json->'results'->>'prevent_age')::numeric)::integer
                    ELSE NULL
                END
            )
        """
    )


def downgrade() -> None:
    op.drop_column("prevent_records", "prevent_age", schema="public")
    op.drop_column("prevent_records", "hf_category", schema="public")
    op.drop_column("prevent_records", "ascvd_category", schema="public")
    op.drop_column("prevent_records", "cvd_category", schema="public")
    op.drop_column("prevent_records", "hf_risk_10y", schema="public")
    op.drop_column("prevent_records", "ascvd_risk_10y", schema="public")
    op.drop_column("prevent_records", "cvd_risk_10y", schema="public")
    op.drop_column("prevent_records", "model_variant_used", schema="public")
    op.drop_column("prevent_records", "sdi", schema="public")
    op.drop_column("prevent_records", "hba1c", schema="public")
    op.drop_column("prevent_records", "uacr", schema="public")
