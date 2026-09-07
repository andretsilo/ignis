# Contributing to ignis

## Development workflow

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker Desktop (WSL2 backend on Windows) or Docker Engine (Linux)

### Running locally

1. **Start infrastructure:**
   ```bash
   docker compose up postgres redis -d
   ```

2. **Backend** (in `backend/`):
   ```bash
   python -m venv .venv
   .venv\Scripts\activate        # Windows
   # or: source .venv/bin/activate  # Linux/macOS

   pip install -r requirements.txt -r requirements-dev.txt
   cp .env.example .env
   # Edit .env:
   #   ALEMBIC_DATABASE_URL=postgresql://ignis:ignis@localhost:5432/ignis
   #   DATABASE_URL=postgresql+asyncpg://ignis:ignis@localhost:5432/ignis
   #   REDIS_URL=redis://localhost:6379/0
   #   SECRET_KEY=<any random string for local dev>

   alembic upgrade head
   fastapi dev app/main.py       # http://localhost:8000
   ```

3. **Celery worker** (separate terminal, in `backend/`):
   ```bash
   .venv\Scripts\activate
   celery -A app.worker.celery_app worker --loglevel=info
   ```

4. **Frontend** (in `frontend/`):
   ```bash
   npm install
   npm run dev                   # http://localhost:5173
   ```

### Running tests

**Backend:**
```bash
cd backend
.venv\Scripts\pytest tests/ -v       # Windows
# or: .venv/bin/pytest tests/ -v     # Linux/macOS
```

12 tests covering auth flow, JWT validation, job isolation, and executor registry.
Uses SQLite in-memory — no Postgres needed.

**Frontend:**
```bash
cd frontend
npm test
```

14 component smoke tests using vitest + @testing-library/react.

---

## Adding a new GPU executor

1. Create `backend/app/executors/<name>.py` implementing `BaseExecutor`:
   ```python
   from .base import BaseExecutor
   from typing import Any

   class MyExecutor(BaseExecutor):
       def name(self) -> str:
           return "my_executor"

       def get_run_kwargs(self, job_id, workspace_path, image, entrypoint) -> dict[str, Any]:
           return {
               "name": f"training-job-{job_id}",
               "image": image,
               "command": ["sh", "-c", entrypoint],
               "working_dir": workspace_path,
               "detach": True,
               # add GPU-specific flags here
           }
   ```

2. Register it in `backend/app/executors/registry.py`:
   ```python
   from .my_executor import MyExecutor
   _REGISTRY["my_executor"] = MyExecutor()
   ```

3. Add a test in `backend/tests/test_executor.py`.

4. Document it in `README.md` and `frontend/src/pages/HelpPage.tsx`.

---

## Adding a new API endpoint

1. Create or extend a router in `backend/app/routers/`.
2. Register it in `backend/app/main.py`.
3. Add the corresponding method to `frontend/src/api.ts`.
4. Update `frontend/src/types.ts` if new response shapes are needed.
5. Write tests.

---

## Database migrations

```bash
cd backend
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

Always review auto-generated migrations before committing — autogenerate can miss things like enum renames.

---

## Code style

- **Python:** PEP 8. Use type annotations throughout. Prefer `async def` for route handlers and service functions.
- **TypeScript:** Strict mode. No `any` unless unavoidable. Prefer explicit return types on hooks.
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

---

## Pull request checklist

- [ ] `pytest tests/ -v` passes (backend)
- [ ] `npm test` passes (frontend)
- [ ] New features have tests
- [ ] `backend/.env.example` updated if new env vars added
- [ ] README updated if user-facing behavior changed
