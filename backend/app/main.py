from fastapi import FastAPI
from app.config import get_settings
from app.worker.tasks import start_job
from uuid import uuid4
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

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}

@app.post("/jobs")
async def run_job():
    job_id = str(uuid4())
    start_job.delay(job_id)
    return {"job_id": job_id}