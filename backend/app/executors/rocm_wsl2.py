from typing import Any
from .base import BaseExecutor


class RocmWSL2Executor(BaseExecutor):
    """AMD ROCm via ROCDXG on WSL2 (/dev/dxg + DXCore bridge)."""

    def name(self) -> str:
        return "rocm_wsl2"

    def get_run_kwargs(self, job_id: str, workspace_path: str, image: str, entrypoint: str) -> dict[str, Any]:
        return {
            "name": f"training-job-{job_id}",
            "image": image,
            "command": ["sh", "-c", entrypoint],
            "volumes": [
                "/var/lib/docker/volumes/ignis_job_data/_data:/data/jobs:rw",
                "/var/lib/docker/volumes/ignis_job_data/_data/librocdxg.so:/opt/rocm/lib/librocdxg.so:ro",
                "/var/lib/docker/volumes/ignis_job_data/_data/libdxcore.so:/usr/lib/libdxcore.so:ro",
                "/var/lib/docker/volumes/ignis_job_data/_data/rocdxg:/usr/share/rocdxg:ro",
            ],
            "devices": ["/dev/dxg"],
            "environment": {
                "PYTHONUNBUFFERED": "1",
                "HSA_ENABLE_DXG_DETECTION": "1",
                "HSA_USE_DXG": "1",
            },
            "ipc_mode": "host",
            "shm_size": "8G",
            "working_dir": workspace_path,
            "detach": True,
        }
