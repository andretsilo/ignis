from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_user
from app.db.models import User
from app.db.session import get_db_session
from app.services import jobs as job_service
from app.config import get_settings
import os

settings = get_settings()
router = APIRouter(prefix="/jobs", tags=["artifacts"])

# Files to always exclude from artifact listings
_EXCLUDED_NAMES = {"upload.zip"}

# Only surface files with these extensions as artifacts
# Everything else (source .py, .txt, .json configs, etc.) is noise
_ARTIFACT_EXTENSIONS = {
    # Models
    ".pt", ".pth", ".ckpt", ".safetensors", ".bin", ".onnx", ".h5", ".pb",
    ".tflite", ".mlmodel", ".pkl", ".joblib",
    # Images / plots
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".pdf",
    # Metrics / results (intentionally kept small)
    ".csv", ".jsonl",
    # Archives (user-produced, not the input zip)
    ".zip", ".tar", ".tar.gz",
}


def _safe_path(base: Path, filename: str) -> Path:
    """Ensure the resolved path stays inside base (prevent directory traversal)."""
    target = (base / filename).resolve()
    if not str(target).startswith(str(base.resolve())):
        raise HTTPException(status_code=400, detail="Invalid file path")
    return target


def _is_artifact(rel: Path) -> bool:
    """Return True if this file should be shown as a downloadable artifact."""
    name = rel.name
    if name in _EXCLUDED_NAMES:
        return False
    # Skip anything inside the workspace/ extraction directory that is
    # a source file — we only care about outputs the script produced
    parts = rel.parts
    if parts and parts[0] == "workspace":
        # Inside workspace: only surface files with artifact extensions
        return rel.suffix.lower() in _ARTIFACT_EXTENSIONS
    # Outside workspace (e.g. files the script wrote to /data/jobs/<id>/
    # directly, or a future outputs/ dir): always include
    return True


@router.get("/{job_id}/artifacts")
async def list_artifacts(
    job_id: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    await job_service.get_job(job_id, db, current_user)  # auth check
    job_dir = Path(settings.data_dir) / job_id
    files = []
    if job_dir.exists():
        for root, _, filenames in os.walk(job_dir):
            for fn in filenames:
                fp = Path(root) / fn
                try:
                    rel = fp.relative_to(job_dir)
                except ValueError:
                    continue
                if _is_artifact(rel):
                    files.append({"name": str(rel).replace("\\", "/"), "size": fp.stat().st_size})
    files.sort(key=lambda f: f["name"])
    return {"job_id": job_id, "files": files}


@router.get("/{job_id}/artifacts/download")
async def download_artifact(
    job_id: str,
    file: str,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    await job_service.get_job(job_id, db, current_user)  # auth check
    job_dir = Path(settings.data_dir) / job_id
    target = _safe_path(job_dir, file)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(target), filename=target.name)
