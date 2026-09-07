# ignis 🔥

Self-hosted GPU training platform. Submit deep learning jobs from any device, run them in isolated Docker containers on your own hardware, and stream logs live to your browser.

---

## What it does

You open the dashboard, upload a ZIP containing your training script, choose a Docker image, and hit Submit. ignis:

- Queues the job and dispatches it to a Celery worker
- Runs the container with the right GPU flags (ROCm / CUDA / CPU)
- Streams stdout/stderr live to your browser via WebSockets + Redis Pub/Sub
- Records exit codes, error output, and all output files as downloadable artifacts
- Enforces per-user job isolation — each account only sees its own jobs

**Stack:** FastAPI · React 18 / TypeScript · Celery · Redis · PostgreSQL · Docker · WebSockets · Tailscale

---

## Architecture

```
Browser (React + WebSocket)
    │
    ▼
FastAPI (HTTP + /ws/jobs/{id})
    │               │
    ▼               ▼
PostgreSQL      Redis Pub/Sub
    │               ▲
    ▼               │
Celery Worker ──────┘   (publishes log lines on job:<id>:logs)
    │
    ▼
Docker container (training job)
    └── /dev/dxg (ROCm/WSL2) | NVIDIA GPU | no GPU
```

The worker publishes each log line to `job:<id>:logs` on Redis. The FastAPI WebSocket handler subscribes to that channel and fans each message out to all connected browser clients in real time.

---

## GPU support

| Executor | Hardware | How it works |
|---|---|---|
| `rocm_wsl2` | AMD GPU on Windows/WSL2 | `/dev/dxg` + librocdxg (ROCDXG method). Confirmed on RX 9060 XT (gfx1200), ROCm 7.2.1. |
| `cuda` | NVIDIA GPU | nvidia-container-toolkit, standard `--gpus all` passthrough. |
| `cpu` | Any machine | No GPU — works anywhere Docker runs. Slow but always works. |

Set `GPU_EXECUTOR` in `backend/.env` to match your hardware.

---

## Quick start

### Prerequisites

- Docker Desktop (WSL2 backend on Windows) or Docker Engine on Linux
- Git

### 1. Clone

```bash
git clone https://github.com/youruser/ignis.git
cd ignis
```

### 2. Configure

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set a real `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Minimum config:

```env
DATABASE_URL=postgresql+asyncpg://ignis:ignis@postgres:5432/ignis
REDIS_URL=redis://redis:6379/0
DATA_DIR=/data/jobs
GPU_EXECUTOR=cpu          # cpu | cuda | rocm_wsl2
SECRET_KEY=<your-generated-key>
```

### 3. Start

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, the FastAPI backend, the Celery worker, and the React frontend.

### 4. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 5. Open the app

- **Frontend:** http://localhost:3000
- **API docs:** http://localhost:8000/docs

Create an account on the login screen, then submit a training job.

---

## Remote access (Tailscale)

ignis is designed to run behind [Tailscale](https://tailscale.com/download). Install it on the GPU machine and on your client device, join the same tailnet, and navigate to `http://<tailscale-ip>:3000`.

To point the frontend at a remote backend at build time:

```bash
VITE_API_URL=http://<tailscale-ip>:8000 VITE_WS_URL=ws://<tailscale-ip>:8000 docker compose up --build
```

---

## AMD ROCm on Windows/WSL2 (confirmed working)

Validated setup:

| Component | Version |
|---|---|
| GPU | AMD Radeon RX 9060 XT (gfx1200 / RDNA4, 16 GB) |
| ROCm | 7.2.1 via ROCDXG (`/dev/dxg` + librocdxg v1.2.0) |
| AMD Adrenalin driver | 26.10.x |
| WSL2 distro | Ubuntu 24.04, kernel 6.18.x |

After ROCm is set up in WSL2, seed the libraries into the Docker volume:

```bash
bash scripts/seed-rocm-libs.sh
```

Set `GPU_EXECUTOR=rocm_wsl2` in `backend/.env`.

See [architecture/WSL-ROCM-RESTART.md](architecture/WSL-ROCM-RESTART.md) for the full setup runbook and the post-reboot checklist.

---

## Development setup

### Backend

Requires Python 3.12.

```bash
# Start infrastructure only
docker compose up postgres redis -d

cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env: set ALEMBIC_DATABASE_URL=postgresql://ignis:ignis@localhost:5432/ignis

alembic upgrade head
fastapi dev app/main.py        # hot reload on :8000
```

Celery worker (separate terminal):

```bash
celery -A app.worker.celery_app worker --loglevel=info
```

### Frontend

Requires Node.js 20+.

```bash
cd frontend
npm install
npm run dev        # hot reload on :5173
```

---

## Testing

### Backend

```bash
cd backend
# Install test deps if you haven't (one-time):
.venv\Scripts\pip install -r requirements-dev.txt   # Windows
# or: .venv/bin/pip install -r requirements-dev.txt  # Linux/macOS

.venv\Scripts\pytest tests/ -v      # Windows
# or:
.venv/bin/pytest tests/ -v          # Linux/macOS
```

Tests use SQLite in-memory — no running Postgres required. 12 tests covering: auth flow, JWT validation, job isolation, executor registry.

### Frontend

```bash
cd frontend
npm test
```

14 component/page smoke tests covering: StatusBadge all statuses, LogViewer ANSI stripping + auto-scroll, AuthPage form validation.

---

## Project structure

```
ignis/
├── backend/
│   ├── app/
│   │   ├── auth/           # JWT + bcrypt security, dependency injection
│   │   ├── db/             # SQLAlchemy models (User, Job) + async session
│   │   ├── executors/      # GPU executor abstraction (cpu, cuda, rocm_wsl2)
│   │   ├── routers/        # FastAPI routers (auth, jobs, ws, artifacts, system)
│   │   ├── services/       # Business logic (auth, jobs)
│   │   ├── worker/         # Celery app + tasks (runs Docker containers)
│   │   ├── config.py       # Pydantic settings from .env
│   │   ├── main.py         # FastAPI app, CORS, router registration
│   │   └── schemas.py      # Pydantic response schemas
│   ├── alembic/            # DB migrations
│   ├── tests/              # pytest tests (SQLite in-memory)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # StatusBadge, LogViewer, ArtifactsPanel, SystemGauges
│   │   ├── context/        # AuthContext (JWT storage)
│   │   ├── hooks/          # useInterval, useJobSocket
│   │   ├── pages/          # AuthPage, JobListPage, JobDetailPage, JobSubmitPage, HelpPage
│   │   ├── api.ts          # Typed fetch wrapper
│   │   └── types.ts        # Shared TypeScript types
│   ├── Dockerfile          # Multi-stage: build → nginx
│   ├── nginx.conf
│   └── .env.example
├── scripts/
│   └── seed-rocm-libs.sh   # Copy ROCm libs into Docker volume (AMD/WSL2 only)
├── architecture/           # Design docs, PRD, diagrams, ROCm runbooks
└── docker-compose.yml      # All 5 services: postgres, redis, backend, worker, frontend
```

---

## API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account, returns JWT |
| `POST` | `/auth/login` | — | Sign in, returns JWT |
| `GET` | `/jobs` | ✓ | List your jobs |
| `POST` | `/jobs` | ✓ | Submit a new job (multipart: zip, image, entrypoint) |
| `GET` | `/jobs/{id}` | ✓ | Get job details |
| `POST` | `/jobs/{id}/cancel` | ✓ | Cancel a running job |
| `GET` | `/jobs/{id}/artifacts` | ✓ | List output files |
| `GET` | `/jobs/{id}/artifacts/download?file=<path>` | ✓ | Download a file |
| `WS` | `/ws/jobs/{id}` | — | Live log stream |
| `GET` | `/system/stats` | — | CPU / RAM / GPU metrics |

Full interactive docs at `/docs` when the backend is running.

---

## Training script contract

Your script runs inside a Docker container. The working directory is the root of your unzipped ZIP.

- Exit code `0` → job marked **completed**
- Any other exit code → job marked **failed**; the last 200 lines of stdout/stderr are saved
- Exit codes `137` / `143` → job marked **cancelled** (SIGKILL / SIGTERM)
- `PYTHONUNBUFFERED=1` is always set so output appears in real time
- All files written to the working directory appear as downloadable artifacts

---

## License

MIT
