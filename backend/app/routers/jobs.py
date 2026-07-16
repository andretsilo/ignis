from fastapi import APIRouter, Depends, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job
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
) -> Job:
    return await job_service.create_job(zip, image, entrypoint, db)


@router.get("")
async def list_jobs(db: AsyncSession = Depends(get_db_session)) -> list[Job]:
    return await job_service.list_jobs(db)


@router.get("/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db_session)) -> Job:
    return await job_service.get_job(job_id, db)


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db_session)):
    return await job_service.cancel_job(job_id, db)
