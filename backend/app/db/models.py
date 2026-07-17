import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class JobStatus(str, enum.Enum):
    queued = "queued"
    building = "building"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class SourceType(str, enum.Enum):
    zip = "zip"
    git = "git"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ownership
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # status
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus), nullable=False, default=JobStatus.queued
    )

    # input source
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), nullable=False)
    git_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    git_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    workspace_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # runtime config
    image: Mapped[str] = mapped_column(Text, nullable=False)
    entrypoint: Mapped[str] = mapped_column(Text, nullable=False)
    hyperparameters: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    timeout_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # execution
    container_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    exit_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # result
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    artifacts_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
