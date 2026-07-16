from fastapi import FastAPI, UploadFile, status, Depends, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import select
from contextlib import asynccontextmanager
from app.config import get_settings
from app.worker.tasks import unzip_and_pull_image, stop_container
from app.db.session import sessionmanager, get_db_session
from app.db.models import Job, JobStatus, SourceType
from uuid import uuid4
from pathlib import Path
from datetime import datetime, timezone
import logging
import sys
import shutil

settings = get_settings()

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    if sessionmanager._engine is not None:
        await sessionmanager.close()

app = FastAPI(lifespan=lifespan, title='ignis')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"] 
)

@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}

@app.post("/jobs", status_code=status.HTTP_201_CREATED)
async def upload_zip(
    zip: UploadFile, 
    image: str = Form(default="rocm/pytorch:rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1"), 
    entrypoint: str = Form(default="pip install -r requirements.txt && python train.py"),
    db: AsyncSession = Depends(get_db_session)
):
    job_id = uuid4()
    jobs_dir_path = Path(f"{settings.data_dir}/{str(job_id)}")
    jobs_dir_path.mkdir(parents=True, exist_ok=True)

    logger.info(f"Created folder for job: {job_id}")

    with open(jobs_dir_path / "upload.zip", "wb") as f:
        shutil.copyfileobj(zip.file, f)
        logger.info(f"Saved the zip file to: {f.name}")
        
    job = Job(
        id=job_id,
        status=JobStatus.queued,
        source_type=SourceType.zip,
        image=image,
        entrypoint=entrypoint,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

    db.add(job)
    await db.commit()
    logger.info(f"Persisted job: {job_id}")

    unzip_and_pull_image.delay(str(job_id))
    return {"job_id": job_id}

@app.get("/jobs")
async def get_jobs(db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(Job))
    return result.scalars().all()
    
@app.get("/jobs/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db_session)):
    return await db.get(Job, job_id)

@app.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db_session)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status in (JobStatus.failed, JobStatus.cancelled, JobStatus.completed):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job is already finished")
    stop_container.delay(job_id)
    return {"status": "cancelling"}
