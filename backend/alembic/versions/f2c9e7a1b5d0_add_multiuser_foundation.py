"""add multiuser foundation

Revision ID: f2c9e7a1b5d0
Revises: e6b9c1d4a8f2
Create Date: 2026-05-31 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "f2c9e7a1b5d0"
down_revision: Union[str, None] = "e6b9c1d4a8f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("auth_provider", sa.String(length=50), nullable=False),
        sa.Column("auth_subject", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("full_name", sa.String(length=150), nullable=True),
        sa.Column("role", sa.String(length=50), server_default=sa.text("'doctor'"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth_provider", "auth_subject", name="uq_app_users_auth_identity"),
        sa.UniqueConstraint("email"),
        schema="public",
    )
    op.create_table(
        "doctors",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("display_name", sa.String(length=150), nullable=False),
        sa.Column("specialty", sa.String(length=150), nullable=True),
        sa.Column("license_number", sa.String(length=80), nullable=True),
        sa.Column("institution_name", sa.String(length=150), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["public.app_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        schema="public",
    )
    op.create_table(
        "public_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_label", sa.String(length=80), nullable=True),
        sa.Column("session_metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_table(
        "patients",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("owner_doctor_id", sa.UUID(), nullable=True),
        sa.Column("public_session_id", sa.UUID(), nullable=True),
        sa.Column("external_code", sa.String(length=100), nullable=True),
        sa.Column("patient_age", sa.Integer(), nullable=True),
        sa.Column("patient_sex", sa.String(length=20), nullable=True),
        sa.Column("patient_country", sa.String(length=100), nullable=True),
        sa.Column("patient_province_code", sa.String(length=20), nullable=True),
        sa.Column("patient_canton_code", sa.String(length=20), nullable=True),
        sa.Column("patient_metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["owner_doctor_id"], ["public.doctors.id"]),
        sa.ForeignKeyConstraint(["public_session_id"], ["public.public_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("actor_user_id", sa.UUID(), nullable=True),
        sa.Column("actor_role", sa.String(length=50), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=True),
        sa.Column("request_id", sa.String(length=100), nullable=True),
        sa.Column("audit_metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["actor_user_id"], ["public.app_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )
    op.create_table(
        "follow_up_records",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("patient_id", sa.UUID(), nullable=False),
        sa.Column("owner_doctor_id", sa.UUID(), nullable=True),
        sa.Column("prevent_record_id", sa.UUID(), nullable=True),
        sa.Column("follow_up_type", sa.String(length=80), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("follow_up_payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["owner_doctor_id"], ["public.doctors.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["public.patients.id"]),
        sa.ForeignKeyConstraint(["prevent_record_id"], ["public.prevent_records.id"]),
        sa.PrimaryKeyConstraint("id"),
        schema="public",
    )

    op.add_column("prevent_records", sa.Column("created_by_user_id", sa.UUID(), nullable=True), schema="public")
    op.add_column("prevent_records", sa.Column("owner_doctor_id", sa.UUID(), nullable=True), schema="public")
    op.add_column("prevent_records", sa.Column("patient_id", sa.UUID(), nullable=True), schema="public")
    op.add_column("prevent_records", sa.Column("public_session_id", sa.UUID(), nullable=True), schema="public")
    op.add_column("prevent_records", sa.Column("source_type", sa.String(length=50), nullable=True), schema="public")
    op.add_column("prevent_records", sa.Column("user_type", sa.String(length=50), nullable=True), schema="public")
    op.add_column("prevent_records", sa.Column("visibility_scope", sa.String(length=80), nullable=True), schema="public")
    op.add_column("prevent_records", sa.Column("created_modality", sa.String(length=80), nullable=True), schema="public")
    op.add_column("prevent_records", sa.Column("request_id", sa.String(length=100), nullable=True), schema="public")

    op.create_foreign_key(
        "fk_prevent_records_created_by_user_id_app_users",
        "prevent_records",
        "app_users",
        ["created_by_user_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "fk_prevent_records_owner_doctor_id_doctors",
        "prevent_records",
        "doctors",
        ["owner_doctor_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "fk_prevent_records_patient_id_patients",
        "prevent_records",
        "patients",
        ["patient_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
    )
    op.create_foreign_key(
        "fk_prevent_records_public_session_id_public_sessions",
        "prevent_records",
        "public_sessions",
        ["public_session_id"],
        ["id"],
        source_schema="public",
        referent_schema="public",
    )

    op.execute(
        """
        UPDATE public.prevent_records
        SET
            source_type = COALESCE(source_type, 'legacy'),
            user_type = COALESCE(user_type, 'legacy'),
            visibility_scope = COALESCE(visibility_scope, 'legacy_admin_only'),
            created_modality = COALESCE(created_modality, 'legacy_dashboard')
        """
    )

    op.create_index("ix_prevent_records_created_by_user_id", "prevent_records", ["created_by_user_id"], schema="public")
    op.create_index("ix_prevent_records_owner_doctor_id", "prevent_records", ["owner_doctor_id"], schema="public")
    op.create_index("ix_prevent_records_patient_id", "prevent_records", ["patient_id"], schema="public")
    op.create_index("ix_prevent_records_public_session_id", "prevent_records", ["public_session_id"], schema="public")
    op.create_index("ix_prevent_records_source_type", "prevent_records", ["source_type"], schema="public")
    op.create_index("ix_prevent_records_visibility_scope", "prevent_records", ["visibility_scope"], schema="public")
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"], schema="public")
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"], schema="public")
    op.create_index("ix_doctors_user_id", "doctors", ["user_id"], schema="public")
    op.create_index("ix_patients_owner_doctor_id", "patients", ["owner_doctor_id"], schema="public")
    op.create_index("ix_patients_public_session_id", "patients", ["public_session_id"], schema="public")
    op.create_index("ix_follow_up_records_patient_id", "follow_up_records", ["patient_id"], schema="public")
    op.create_index("ix_follow_up_records_owner_doctor_id", "follow_up_records", ["owner_doctor_id"], schema="public")


def downgrade() -> None:
    op.drop_index("ix_follow_up_records_owner_doctor_id", table_name="follow_up_records", schema="public")
    op.drop_index("ix_follow_up_records_patient_id", table_name="follow_up_records", schema="public")
    op.drop_index("ix_patients_public_session_id", table_name="patients", schema="public")
    op.drop_index("ix_patients_owner_doctor_id", table_name="patients", schema="public")
    op.drop_index("ix_doctors_user_id", table_name="doctors", schema="public")
    op.drop_index("ix_audit_logs_entity", table_name="audit_logs", schema="public")
    op.drop_index("ix_audit_logs_actor_user_id", table_name="audit_logs", schema="public")
    op.drop_index("ix_prevent_records_visibility_scope", table_name="prevent_records", schema="public")
    op.drop_index("ix_prevent_records_source_type", table_name="prevent_records", schema="public")
    op.drop_index("ix_prevent_records_public_session_id", table_name="prevent_records", schema="public")
    op.drop_index("ix_prevent_records_patient_id", table_name="prevent_records", schema="public")
    op.drop_index("ix_prevent_records_owner_doctor_id", table_name="prevent_records", schema="public")
    op.drop_index("ix_prevent_records_created_by_user_id", table_name="prevent_records", schema="public")

    op.drop_constraint(
        "fk_prevent_records_public_session_id_public_sessions",
        "prevent_records",
        schema="public",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_prevent_records_patient_id_patients",
        "prevent_records",
        schema="public",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_prevent_records_owner_doctor_id_doctors",
        "prevent_records",
        schema="public",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_prevent_records_created_by_user_id_app_users",
        "prevent_records",
        schema="public",
        type_="foreignkey",
    )

    op.drop_column("prevent_records", "request_id", schema="public")
    op.drop_column("prevent_records", "created_modality", schema="public")
    op.drop_column("prevent_records", "visibility_scope", schema="public")
    op.drop_column("prevent_records", "user_type", schema="public")
    op.drop_column("prevent_records", "source_type", schema="public")
    op.drop_column("prevent_records", "public_session_id", schema="public")
    op.drop_column("prevent_records", "patient_id", schema="public")
    op.drop_column("prevent_records", "owner_doctor_id", schema="public")
    op.drop_column("prevent_records", "created_by_user_id", schema="public")

    op.drop_table("follow_up_records", schema="public")
    op.drop_table("audit_logs", schema="public")
    op.drop_table("patients", schema="public")
    op.drop_table("public_sessions", schema="public")
    op.drop_table("doctors", schema="public")
    op.drop_table("app_users", schema="public")
