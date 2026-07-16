from app.worker.celery_app import celery_app
from app.config import get_settings
from pathlib import Path
import docker
import zipfile
import logging
import sys

settings = get_settings()
client = docker.from_env()

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout
)

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def unzip_and_pull_image(self, job_id: str):
    logger.info(f"Started job: {job_id}")

    repository = "rocm/pytorch"
    tag = "rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1"

    unzip_job_file(job_id)

def unzip_job_file(job_id: str):
    zip_path = Path(f"{settings.data_dir}/{str(job_id)}/upload.zip")
    workspace_dir = Path(f"{settings.data_dir}/{str(job_id)}/workspace")
    workspace_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path , 'r') as zip_ref:
        zip_ref.extractall(workspace_dir)

def build_and_pull_image(repository: str, tag: str):
    image = client.images.pull(repository=repository, tag=tag)