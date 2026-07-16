from app.worker.celery_app import celery_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Job
from app.config import get_settings
from pathlib import Path
import docker
import zipfile
import logging
import sys

settings = get_settings()
client = docker.from_env()
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
    with SessionLocal() as db:
        job = db.get(Job)

    logger.info(f"Started job: {job_id}")

    image = "rocm/pytorch:rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1"

    unzip_job_file(job_id)
    build_and_pull_image(image)

def unzip_job_file(job_id: str):
    zip_path = Path(f"{settings.data_dir}/{str(job_id)}/upload.zip")
    workspace_dir = Path(f"{settings.data_dir}/{str(job_id)}/workspace")
    workspace_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path , 'r') as zip_ref:
        zip_ref.extractall(workspace_dir)

def build_and_pull_image(image: str):
    client.containers.run(image=image,)