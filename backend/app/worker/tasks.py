from app.worker.celery_app import celery_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Job, JobStatus
from app.config import get_settings
from pathlib import Path
from docker.errors import ImageNotFound, APIError
from datetime import datetime, timezone
import docker
import zipfile
import logging
import sys

settings = get_settings()

engine = create_engine(settings.database_url.replace("postgresql+asyncpg://", "postgresql://"))
SessionLocal = sessionmaker(bind=engine)

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout
)

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def unzip_and_pull_image(self, job_id: str):
    client = docker.from_env()
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        job.status = JobStatus.building
        db.commit()
        
        logger.info(f"Started job: {job_id}")

        try:
            workspace_path = unzip_job_file(job_id)
        except Exception as e:
            logger.error(str(e) + f"\n in job: {job_id}")
            job.status = JobStatus.failed
            db.commit()
            return

        logger.info(f"Running container for job: {job_id}, image: {job.image}")

        try:
            job.status = JobStatus.running
            db.commit()
            logger.info(f"Will mount voolume: {str(workspace_path)}")
            container = client.containers.run(
                name=f"training-job-{job_id}",
                image=job.image,
                command=["sh", "-c", "pip install -r requirements.txt && python train.py"],
                volumes=[
                    "/var/lib/docker/volumes/ignis_job_data/_data:/data/jobs:rw",
                    "/var/lib/docker/volumes/ignis_job_data/_data/librocdxg.so:/opt/rocm/lib/librocdxg.so:ro",
                    "/var/lib/docker/volumes/ignis_job_data/_data/libdxcore.so:/usr/lib/libdxcore.so:ro",
                    "/var/lib/docker/volumes/ignis_job_data/_data/rocdxg:/usr/share/rocdxg:ro",
                ],
                devices=["/dev/dxg"],
                environment={
                    "PYTHONUNBUFFERED": "1",
                    "HSA_ENABLE_DXG_DETECTION": "1",
                    "HSA_USE_DXG": "1"
                },
                ipc_mode="host",
                shm_size="8G",
                working_dir=str(workspace_path),
                detach=True
            )

            response = container.wait()
            exit_code = response["StatusCode"]
            error_message = container.logs().decode('utf-8') if exit_code != 0 else None
            job.exit_code = exit_code
            job.error_message = error_message
            job.status = JobStatus.completed if exit_code == 0 else JobStatus.failed
            job.updated_at = datetime.now(timezone.utc)
            db.commit()
            container.remove()
        except Exception as e:
            error_message = f"Image not found for job: {job_id}" if isinstance(e, ImageNotFound) else str(e) + f"\n in job: {job_id}"
            logger.error(error_message)
            job.status = JobStatus.failed
            job.error_message = error_message
            db.commit()
        
def unzip_job_file(job_id: str) -> Path:
    zip_path = Path(f"{settings.data_dir}/{str(job_id)}/upload.zip")
    workspace_dir = Path(f"{settings.data_dir}/{str(job_id)}/workspace")
    workspace_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Created workspace folder for job: {job_id}")

    with zipfile.ZipFile(zip_path , 'r') as zip_ref:
        zip_ref.extractall(workspace_dir)

    logger.info(f"Extracted everything to: {str(workspace_dir)}")

    contents = list(workspace_dir.iterdir())
    while len(contents) == 1 and contents[0].is_dir():
        logger.info("Found nested directories.")
        workspace_dir = contents[0]
        contents = list(workspace_dir.iterdir())
    logger.info(f"New workspace will be: {str(workspace_dir)}")

    return workspace_dir

