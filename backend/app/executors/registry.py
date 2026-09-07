from .base import BaseExecutor
from .cpu import CPUExecutor
from .cuda import CUDAExecutor
from .rocm_wsl2 import RocmWSL2Executor

_REGISTRY: dict[str, BaseExecutor] = {
    "cpu": CPUExecutor(),
    "cuda": CUDAExecutor(),
    "rocm_wsl2": RocmWSL2Executor(),
}


def get_executor(name: str) -> BaseExecutor:
    ex = _REGISTRY.get(name)
    if ex is None:
        raise ValueError(f"Unknown executor: {name!r}. Available: {list(_REGISTRY.keys())}")
    return ex
