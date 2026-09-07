"""Pydantic response schemas for the API."""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.db.models import JobStatus, SourceType


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class JobOut(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    status: JobStatus
    source_type: SourceType
    git_url: Optional[str]
    git_branch: Optional[str]
    image: str
    entrypoint: str
    container_id: Optional[str]
    exit_code: Optional[int]
    celery_task_id: Optional[str]
    error_message: Optional[str]
    artifacts_path: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str
