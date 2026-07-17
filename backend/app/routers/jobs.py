from fastapi import APIRouter, Depends, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.models import Job, User
from app.db.session import get_db_session
from app.services import jobs as job_service

DEFAULT_IMAGE = "rocm/pytorch:rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1"
DEFAULT_ENTRYPOINT = "pip install -r requirements.txt && python train.py"

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_job(
    zip: UploadFile,
    image: str = Form(default=DEFAULT_IMAGE),
    entrypoint: str = Form(default=DEFAULT_ENTRYPOINT),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Job:
    return await job_service.create_job(zip, image, entrypoint, db, current_user)


@router.get("")
async def list_jobs(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[Job]:
    return await job_service.list_jobs(db, current_user)


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Job:
    return await job_service.get_job(job_id, db, current_user)


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return await job_service.cancel_job(job_id, db, current_user)
