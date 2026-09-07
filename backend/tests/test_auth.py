import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # Register
    resp = await client.post("/auth/register", json={"username": "alice", "password": "password123"})
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    assert token

    # Login with same credentials
    resp = await client.post(
        "/auth/login",
        data={"username": "alice", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    await client.post("/auth/register", json={"username": "bob", "password": "password123"})
    resp = await client.post("/auth/register", json={"username": "bob", "password": "different123"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/auth/register", json={"username": "charlie", "password": "password123"})
    resp = await client.post(
        "/auth/login",
        data={"username": "charlie", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_without_token(client: AsyncClient):
    resp = await client.get("/jobs")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_token(client: AsyncClient):
    reg = await client.post("/auth/register", json={"username": "dave", "password": "password123"})
    token = reg.json()["access_token"]
    resp = await client.get("/jobs", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == []
