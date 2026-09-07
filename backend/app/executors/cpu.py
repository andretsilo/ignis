from typing import Any
from .base import BaseExecutor


class CPUExecutor(BaseExecutor):
    """CPU-only executor — no GPU, works on any machine."""

    def name(self) -> str:
        return "cpu"

    def get_run_kwargs(self, job_id: str, workspace_path: str, image: str, entrypoint: str) -> dict[str, Any]:
        return {
            "name": f"training-job-{job_id}",
            "image": image,
            "command": ["sh", "-c", entrypoint],
            "volumes": [
                "/var/lib/docker/volumes/ignis_job_data/_data:/data/jobs:rw",
            ],
            "environment": {"PYTHONUNBUFFERED": "1"},
            "working_dir": workspace_path,
            "detach": True,
        }
