import shutil
import logging
from uuid import uuid4
from pathlib import Path
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import select

from app.config import get_settings
from app.db.models import Job, JobStatus, SourceType, User
from app.worker.tasks import unzip_and_pull_image, stop_container

settings = get_settings()
logger = logging.getLogger(__name__)


async def create_job(
    zip: UploadFile,
    image: str,
    entrypoint: str,
    db: AsyncSession,
    current_user: User,
) -> Job:
    job_id = uuid4()
    job_dir = Path(settings.data_dir) / str(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)

    with open(job_dir / "upload.zip", "wb") as f:
        shutil.copyfileobj(zip.file, f)

    logger.info(f"Saved ZIP for job {job_id}")

    job = Job(
        id=job_id,
        user_id=current_user.id,
        status=JobStatus.queued,
        source_type=SourceType.zip,
        image=image,
        entrypoint=entrypoint,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(job)
    await db.commit()
    logger.info(f"Persisted job {job_id} for user {current_user.username}")

    unzip_and_pull_image.delay(str(job_id))
    return job


async def list_jobs(db: AsyncSession, current_user: User) -> list[Job]:
    result = await db.execute(
        select(Job)
        .where(Job.user_id == current_user.id)
        .order_by(Job.created_at.desc())
    )
    return result.scalars().all()


async def get_job(job_id: str, db: AsyncSession, current_user: User) -> Job:
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return job


async def cancel_job(job_id: str, db: AsyncSession, current_user: User) -> dict:
    job = await get_job(job_id, db, current_user)
    if job.status in (JobStatus.failed, JobStatus.cancelled, JobStatus.completed):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job is already finished")
    stop_container.delay(job_id)
    return {"status": "cancelling"}
