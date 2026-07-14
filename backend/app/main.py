from fastapi import FastAPI, UploadFile, status
from contextlib import asynccontextmanager
from app.config import get_settings
from app.worker.tasks import start_job
from app.db.session import sessionmanager
from uuid import uuid4
from pathlib import Path
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

@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}

@app.post("/jobs", status_code=status.HTTP_201_CREATED)
async def upload_zip(zip: UploadFile):
    job_id = str(uuid4())
    jobs_dir_path = Path(f"data/jobs/{job_id}")
    jobs_dir_path.mkdir(parents=True, exist_ok=True)

    logger.info(f"Created folder for job: {job_id}")

    with open(jobs_dir_path / "upload.zip", "wb") as f:
        shutil.copyfileobj(zip.file, f)
        logger.info(f"Saved the zip file to: {f.name}")

    start_job.delay(job_id)
    return {"job_id": job_id}