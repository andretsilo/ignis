from typing import Any
from .base import BaseExecutor


class CUDAExecutor(BaseExecutor):
    """NVIDIA CUDA via nvidia-container-toolkit (Linux native or WSL2)."""

    def name(self) -> str:
        return "cuda"

    def get_run_kwargs(self, job_id: str, workspace_path: str, image: str, entrypoint: str) -> dict[str, Any]:
        return {
            "name": f"training-job-{job_id}",
            "image": image,
            "command": ["sh", "-c", entrypoint],
            "volumes": [
                "/var/lib/docker/volumes/ignis_job_data/_data:/data/jobs:rw",
            ],
            "device_requests": [{"count": -1, "capabilities": [["gpu"]]}],
            "environment": {"PYTHONUNBUFFERED": "1"},
            "ipc_mode": "host",
            "shm_size": "8G",
            "working_dir": workspace_path,
            "detach": True,
        }
