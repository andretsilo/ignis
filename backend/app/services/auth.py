from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.security import verify_password, create_access_token, hash_password
from app.db.models import User
from datetime import datetime, timezone
from uuid import uuid4


async def login(username: str, password: str, db: AsyncSession) -> dict:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


async def register(username: str, password: str, db: AsyncSession) -> dict:
    result = await db.execute(select(User).where(User.username == username))
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    user = User(
        id=uuid4(),
        username=username,
        hashed_password=hash_password(password),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.commit()

    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}
