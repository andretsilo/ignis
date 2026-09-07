import pytest
from app.executors.registry import get_executor
from app.executors.base import BaseExecutor


def test_get_cpu_executor():
    ex = get_executor("cpu")
    assert ex.name() == "cpu"
    kwargs = ex.get_run_kwargs("abc123", "/workspace", "python:3.12", "python train.py")
    assert kwargs["name"] == "training-job-abc123"
    assert kwargs["detach"] is True
    assert "device_requests" not in kwargs


def test_get_rocm_executor():
    ex = get_executor("rocm_wsl2")
    assert ex.name() == "rocm_wsl2"
    kwargs = ex.get_run_kwargs("xyz", "/workspace", "rocm/pytorch:latest", "python train.py")
    assert "/dev/dxg" in kwargs.get("devices", [])
    env = kwargs["environment"]
    assert env["HSA_ENABLE_DXG_DETECTION"] == "1"


def test_get_cuda_executor():
    ex = get_executor("cuda")
    assert ex.name() == "cuda"
    kwargs = ex.get_run_kwargs("xyz", "/workspace", "nvidia/cuda:12.4.0-runtime-ubuntu22.04", "python train.py")
    assert kwargs["device_requests"]


def test_unknown_executor_raises():
    with pytest.raises(ValueError, match="Unknown executor"):
        get_executor("nonexistent")
