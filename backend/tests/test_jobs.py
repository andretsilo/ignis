import io
import zipfile
import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock


async def _register_and_token(client: AsyncClient, username: str = "user1") -> str:
    resp = await client.post("/auth/register", json={"username": username, "password": "password123"})
    return resp.json()["access_token"]


def _make_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("train.py", "print('hello')")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_list_jobs_empty(client: AsyncClient):
    token = await _register_and_token(client)
    resp = await client.get("/jobs", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_submit_job(client: AsyncClient, tmp_path):
    token = await _register_and_token(client, "submitter")
    zip_bytes = _make_zip()
    # Patch data_dir to tmp_path so the worker doesn't need /data/jobs
    with patch("app.services.jobs.settings") as mock_settings, \
         patch("app.services.jobs.unzip_and_pull_image") as mock_task:
        mock_settings.data_dir = str(tmp_path)
        mock_task.delay = MagicMock()
        resp = await client.post(
            "/jobs",
            headers={"Authorization": f"Bearer {token}"},
            files={"zip": ("test.zip", zip_bytes, "application/zip")},
            data={"image": "python:3.12-slim", "entrypoint": "python train.py"},
        )
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert body["status"] == "queued"


@pytest.mark.asyncio
async def test_job_isolation(client: AsyncClient, tmp_path):
    """User A cannot access User B's jobs."""
    token_a = await _register_and_token(client, "usera")
    token_b = await _register_and_token(client, "userb")
    zip_bytes = _make_zip()
    with patch("app.services.jobs.settings") as mock_settings, \
         patch("app.services.jobs.unzip_and_pull_image") as mock_task:
        mock_settings.data_dir = str(tmp_path)
        mock_task.delay = MagicMock()
        resp = await client.post(
            "/jobs",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"zip": ("test.zip", zip_bytes, "application/zip")},
            data={"image": "python:3.12-slim", "entrypoint": "python train.py"},
        )
    job_id = resp.json()["id"]
    # User B should get 403
    resp_b = await client.get(f"/jobs/{job_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert resp_b.status_code == 403
