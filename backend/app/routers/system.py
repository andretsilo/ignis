import subprocess
import logging
from fastapi import APIRouter
import psutil

from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/system", tags=["system"])
settings = get_settings()


def _gpu_stats() -> dict | None:
    """Try rocm-smi then nvidia-smi. Returns None if neither available."""
    # ROCm
    try:
        result = subprocess.run(
            ["rocm-smi", "--showuse", "--showmemuse", "--csv"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            lines = [l for l in result.stdout.strip().splitlines() if l and not l.startswith("device")]
            if lines:
                parts = lines[0].split(",")
                return {
                    "vendor": "AMD",
                    "util_pct": float(parts[1]) if len(parts) > 1 else None,
                    "mem_used_pct": float(parts[2]) if len(parts) > 2 else None,
                }
    except Exception:
        pass
    # NVIDIA
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(",")
            used = float(parts[1].strip())
            total = float(parts[2].strip())
            return {
                "vendor": "NVIDIA",
                "util_pct": float(parts[0].strip()),
                "mem_used_pct": round(used / total * 100, 1) if total else None,
            }
    except Exception:
        pass
    return None


def _gpu_from_executor() -> dict | None:
    """
    Derive a minimal GPU descriptor from GPU_EXECUTOR config when
    rocm-smi / nvidia-smi are not available inside the container.
    Usage/memory stats will be null, but vendor is known.
    """
    executor = settings.gpu_executor
    if executor == "rocm_wsl2":
        return {"vendor": "AMD", "util_pct": None, "mem_used_pct": None}
    if executor == "cuda":
        return {"vendor": "NVIDIA", "util_pct": None, "mem_used_pct": None}
    return None  # cpu — no GPU


@router.get("/stats")
async def system_stats():
    cpu = psutil.cpu_percent(interval=0.2)
    vm = psutil.virtual_memory()

    # Try live GPU stats first; fall back to config-derived vendor info
    gpu = _gpu_stats() or _gpu_from_executor()

    return {
        "cpu_pct": cpu,
        "ram_pct": vm.percent,
        "ram_used_gb": round(vm.used / 1024**3, 2),
        "ram_total_gb": round(vm.total / 1024**3, 2),
        "gpu": gpu,
    }
