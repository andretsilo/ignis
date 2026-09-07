from app.worker.celery_app import celery_app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Job, JobStatus
from app.config import get_settings
from app.executors.registry import get_executor
from pathlib import Path
from docker.errors import ImageNotFound
from datetime import datetime, timezone
import docker
import redis as sync_redis
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


def _stream_logs(client: docker.DockerClient, container, job_id: str, redis_client) -> None:
    """
    Stream container stdout/stderr to Redis in real time.

    Uses the low-level attach API (raw socket) to avoid the multiplexed-frame
    buffering issue that container.logs(stream=True) can exhibit.
    Each newline-delimited chunk is published immediately.
    """
    channel = f"job:{job_id}:logs"
    buffer = b""
    try:
        # attach returns a generator of raw bytes from the Docker daemon
        for chunk in client.api.attach(
            container.id,
            stream=True,
            logs=True,
            stdout=True,
            stderr=True,
        ):
            buffer += chunk
            # Flush complete lines immediately
            while b"\n" in buffer:
                line, buffer = buffer.split(b"\n", 1)
                text = line.decode("utf-8", errors="replace").strip()
                if text:
                    redis_client.publish(channel, text)
                    logger.debug("[job:%s] %s", job_id, text)
        # Flush any remaining partial line
        if buffer:
            text = buffer.decode("utf-8", errors="replace").strip()
            if text:
                redis_client.publish(channel, text)
    except Exception as exc:
        logger.warning("Log streaming interrupted for job %s: %s", job_id, exc)


@celery_app.task(bind=True)
def unzip_and_pull_image(self, job_id: str):
    client = docker.from_env()
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        job.status = JobStatus.building
        db.commit()

        logger.info("Started job: %s", job_id)

        try:
            workspace_path = unzip_job_file(job_id)
        except Exception as e:
            logger.error("Unzip failed for job %s: %s", job_id, e)
            job.status = JobStatus.failed
            job.error_message = str(e)
            db.commit()
            return

        logger.info("Running container for job: %s, image: %s", job_id, job.image)

        try:
            job.status = JobStatus.running
            db.commit()

            executor = get_executor(settings.gpu_executor)
            run_kwargs = executor.get_run_kwargs(
                job_id=job_id,
                workspace_path=str(workspace_path),
                image=job.image,
                entrypoint=job.entrypoint,
            )
            container = client.containers.run(**run_kwargs)

            job.container_id = container.id
            job.updated_at = datetime.now(timezone.utc)
            db.commit()

            # Stream logs to Redis in real time, then wait for exit
            redis_client = sync_redis.Redis.from_url(settings.redis_url, decode_responses=True)
            try:
                _stream_logs(client, container, job_id, redis_client)
            finally:
                redis_client.close()

            # After streaming ends the container has exited — get the exit code
            container.reload()
            exit_code = container.attrs["State"]["ExitCode"]

            error_message = None
            if exit_code not in (0, 137, 143):
                error_message = container.logs(tail=200).decode("utf-8", errors="replace")

            job.exit_code = exit_code
            job.error_message = error_message
            if exit_code in (137, 143):
                job.status = JobStatus.cancelled
            else:
                job.status = JobStatus.completed if exit_code == 0 else JobStatus.failed
            job.updated_at = datetime.now(timezone.utc)
            db.commit()

            try:
                container.remove()
            except Exception:
                pass

        except ImageNotFound:
            msg = f"Docker image not found: {job.image}"
            logger.error(msg)
            job.status = JobStatus.failed
            job.error_message = msg
            db.commit()
        except Exception as e:
            logger.error("Job %s failed: %s", job_id, e)
            job.status = JobStatus.failed
            job.error_message = str(e)
            db.commit()


@celery_app.task(bind=True)
def stop_container(self, job_id: str):
    client = docker.from_env()
    with SessionLocal() as db:
        job = db.get(Job, job_id)

        if not job:
            logger.error("stop_container: job %s not found", job_id)
            return

        if job.status in [JobStatus.failed, JobStatus.cancelled, JobStatus.completed]:
            logger.warning("stop_container: job %s already finished (%s)", job_id, job.status)
            return

        if job.container_id:
            try:
                client.containers.get(job.container_id).stop()
                logger.info("Stopped container for job: %s", job_id)
            except Exception as e:
                logger.warning("Could not stop container for job %s: %s", job_id, e)
        else:
            logger.info("No container for job %s, marking cancelled directly", job_id)

        job.status = JobStatus.cancelled
        job.updated_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("Cancelled job: %s", job_id)


def unzip_job_file(job_id: str) -> Path:
    zip_path = Path(f"{settings.data_dir}/{job_id}/upload.zip")
    workspace_dir = Path(f"{settings.data_dir}/{job_id}/workspace")
    workspace_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Extracting ZIP for job: %s", job_id)

    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(workspace_dir)

    # Unwrap single top-level directory if present (e.g. GitHub ZIP exports)
    contents = list(workspace_dir.iterdir())
    while len(contents) == 1 and contents[0].is_dir():
        workspace_dir = contents[0]
        contents = list(workspace_dir.iterdir())

    logger.info("Workspace ready at: %s", workspace_dir)
    return workspace_dir
