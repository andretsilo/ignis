from app.worker.celery_app import celery_app
from app.config import get_settings
import logging
import sys

settings = get_settings()

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout
)

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def start_job(self, job_id: str):
    logger.info(f"Started job: {job_id}")
    pass