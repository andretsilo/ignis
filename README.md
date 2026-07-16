# ignis

Self-hosted, hardware-agnostic remote GPU training platform. Submit deep learning jobs from anywhere, run them in isolated Docker containers on your own machine (any OS, any GPU vendor), and stream logs/metrics live via WebSockets.

---

## What it does

You open a dashboard on any device, upload a training script or paste a Git URL, and hit Submit. The job runs in an isolated Docker container on your GPU machine. Logs and metrics stream live to your browser. When training finishes, you download the results. Nobody outside your explicit invite list can reach the machine at all.

**Stack:** FastAPI · React/TS · Celery · Redis · PostgreSQL · Docker · WebSockets · Tailscale

---

## Prerequisites

One-time setup per machine. The application code is the same regardless of OS or GPU vendor — only these steps differ.

### 1. Docker Desktop (Windows)

- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- During setup, choose the **WSL2 backend** (not Hyper-V)
- Verify:
  ```
  docker info
  ```
  Should show `Context: desktop-linux` and a kernel version ending in `-WSL2`

### 2. WSL2

Docker Desktop installs WSL2 automatically. Make sure it is the default version:

```powershell
wsl --set-default-version 2
```

Install a clean Ubuntu 24.04 distro if you don't have one:

```powershell
wsl --install -d Ubuntu-24.04
```

### 3. GPU driver setup

Pick the path that matches your hardware.

#### Path A — AMD GPU, ROCm-in-WSL2 via ROCDXG (RDNA4 / RX 9060 XT confirmed working)

This uses the ROCDXG method (`/dev/dxg` + DXCore), which is the production WSL2 path as of ROCm 7.2.1. It does **not** use `/dev/kfd` — that is for native Linux only.

**Requirements:**
- AMD Adrenalin driver ≥ 26.2.2 on Windows (26.10.x confirmed working)
- ROCm 7.2.1
- librocdxg v1.2.0
- Ubuntu 24.04 WSL2

**Steps inside WSL2:**

1. Verify the GPU bridge device exists:
   ```bash
   ls -la /dev/dxg
   ```
   Expected: `crw-rw-rw- 10,258`. If missing, reinstall the AMD Adrenalin driver on Windows.

2. Add the ROCm 7.2.1 repo and install the runtime:
   ```bash
   wget https://repo.radeon.com/rocm/rocm.gpg.key -O - | \
     gpg --dearmor | sudo tee /etc/apt/keyrings/rocm.gpg > /dev/null

   echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/rocm.gpg] \
     https://repo.radeon.com/rocm/apt/7.2.1 noble main" | \
     sudo tee /etc/apt/sources.list.d/rocm.list

   sudo apt update
   sudo apt install rocminfo rocm-hip-runtime
   ```

3. Install librocdxg v1.2.0 (pre-built `.deb`):
   ```bash
   wget https://github.com/ROCm/librocdxg/releases/download/v1.2.0/librocdxg_1.2.0_amd64.deb
   sudo apt install ./librocdxg_1.2.0_amd64.deb
   sudo cp /usr/lib/librocdxg.so* /opt/rocm-7.2.1/lib/
   sudo ldconfig
   ```

4. Verify the GPU is visible:
   ```bash
   HSA_ENABLE_DXG_DETECTION=1 rocminfo | grep -A3 "Agent 2"
   ```
   Expected:
   ```
   Name:                    gfx1200
   Marketing Name:          AMD Radeon RX 9060 XT
   ```

5. Run the PyTorch smoke test:
   ```bash
   docker run --rm \
     --device=/dev/dxg \
     -v /usr/lib/wsl/lib/libdxcore.so:/usr/lib/libdxcore.so \
     -v /opt/rocm/lib/librocdxg.so:/usr/lib/librocdxg.so \
     -v /opt/rocm/share/rocdxg/dids.conf:/usr/share/rocdxg/dids.conf \
     -e HSA_ENABLE_DXG_DETECTION=1 \
     --ipc=host --shm-size 8G \
     rocm/pytorch:rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1 \
     python3 -c "
   import torch
   print('GPU available:', torch.cuda.is_available())
   print('Device:', torch.cuda.get_device_name(0))
   "
   ```
   Expected: `GPU available: True` / `Device: AMD Radeon RX 9060 XT`

Set `GPU_EXECUTOR=rocm_wsl2` in `.env`.

6. Seed the ROCm libraries into the job data volume (required once, survives container rebuilds):
   ```bash
   bash scripts/seed-rocm-libs.sh
   ```
   This copies `librocdxg.so`, `libdxcore.so`, and the `rocdxg` directory into the shared job data volume so the worker can bind-mount them into training containers at runtime. Only needs to be run once — the files persist across restarts. Re-run if you wipe the volume with `docker compose down -v`.

#### Path B — AMD GPU, DirectML (simpler; works on any AMD GPU, no WSL2 required)

No WSL2 GPU setup needed. Works directly on Windows:

```powershell
pip install torch-directml
python -c "import torch_directml; print(torch_directml.device())"
```

Use this if ROCm-in-WSL2 is unstable on your hardware. Set `GPU_EXECUTOR=directml` in `.env`.

#### Path C — NVIDIA GPU, CUDA-in-WSL2

Install the [NVIDIA WSL2 CUDA driver](https://developer.nvidia.com/cuda/wsl) on Windows. Do **not** install CUDA inside WSL2 — the Windows driver handles it. Verify inside WSL2:

```bash
nvidia-smi
```

Set `GPU_EXECUTOR=cuda_wsl2` in `.env`.

#### Path D — CPU only

No GPU setup required. Set `GPU_EXECUTOR=cpu` in `.env`. Slow but always works.

### 4. Tailscale

- Install [Tailscale](https://tailscale.com/download) on the GPU machine and on every client device
- Log in and join the same tailnet, or use node-sharing to grant access to a specific person without adding them to your whole tailnet
- Verify the client can ping the GPU machine's Tailscale IP before continuing

---

## Running the platform

### 1. Clone and configure

```bash
git clone https://github.com/youruser/ignis.git
cd ignis
```

Copy the example env file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://ignis:ignis@postgres:5432/ignis
ALEMBIC_DATABASE_URL=postgresql://ignis:ignis@localhost:5432/ignis
REDIS_URL=redis://redis:6379/0
DATA_DIR=/data/jobs
GPU_EXECUTOR=rocm_wsl2         # change to match your hardware (see above)
APP_ENV=development
SECRET_KEY=replace-this-with-a-long-random-string
LOG_LEVEL=INFO
```

`SECRET_KEY` signs JWT tokens — generate a real one:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Start the stack

```bash
docker compose up -d
```

This starts: PostgreSQL, Redis, the FastAPI backend, and the Celery worker.

Verify everything is running:
```bash
docker compose ps
```

All four services should show `Up (healthy)` or `Up`.

### 3. Run database migrations

```bash
cd backend
alembic upgrade head
```

This creates all tables in PostgreSQL. Run this once on first setup, and again after any future schema changes.

### 4. Verify

Open [http://localhost:8000/docs](http://localhost:8000/docs) — you should see the FastAPI interactive docs.

Check worker logs to confirm Celery connected:
```bash
docker compose logs worker --tail=20
```
Expected: `Connected to redis://redis:6379/0` and `celery@... ready.`

---

## After a reboot

Docker Desktop's WSL integration sometimes resets after a system restart. If containers fail to start or the GPU is not visible:

1. Open Docker Desktop → Settings → Resources → WSL Integration
2. Toggle **Ubuntu-24.04** ON → Apply & Restart
3. Wait ~30 seconds, then `docker compose up -d`

For the full restart runbook see [`architecture/WSL-ROCM-RESTART.md`](architecture/WSL-ROCM-RESTART.md).

---

## Project structure

```
ignis/
├── backend/
│   ├── app/
│   │   ├── db/
│   │   │   ├── base.py          # SQLAlchemy declarative base
│   │   │   └── models.py        # Job model and enums
│   │   ├── worker/
│   │   │   ├── celery_app.py    # Celery instance + config
│   │   │   └── tasks.py         # Background tasks (run_job, ...)
│   │   ├── config.py            # Pydantic settings
│   │   └── main.py              # FastAPI app + routes
│   ├── alembic/                 # Database migrations
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env                     # Not committed — copy from .env.example
├── docker-compose.yml
└── architecture/                # Design docs, diagrams, runbooks
```

---