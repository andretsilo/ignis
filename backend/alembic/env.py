import asyncio
import os
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from alembic import context

from app.db.base import Base
import app.db.models  # noqa: F401 — registers models on Base.metadata

# Alembic Config object
config = context.config

# Load ALEMBIC_DATABASE_URL from .env (one directory up from alembic/)
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        if line.startswith("ALEMBIC_DATABASE_URL="):
            os.environ.setdefault("ALEMBIC_DATABASE_URL", line.split("=", 1)[1])

_url = os.environ["ALEMBIC_DATABASE_URL"].replace(
    "postgresql://", "postgresql+asyncpg://"
)
config.set_main_option("sqlalchemy.url", _url)

# Set up loggers
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_online():
    connectable = context.config.attributes.get("connection", None)
    if connectable is None:
        connectable = create_async_engine(
            config.get_main_option("sqlalchemy.url"),
            poolclass=pool.NullPool,
        )

    if isinstance(connectable, AsyncEngine):
        asyncio.run(run_async_migrations(connectable))
    else:
        do_run_migrations(connectable)


async def run_async_migrations(connectable):
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


run_migrations_online()
