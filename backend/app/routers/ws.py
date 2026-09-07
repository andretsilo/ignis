import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


async def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


@router.websocket("/ws/jobs/{job_id}")
async def job_log_ws(websocket: WebSocket, job_id: str):
    await websocket.accept()
    redis = await get_redis()
    channel = f"job:{job_id}:logs"
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)
    logger.info(f"WS client subscribed to {channel}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        logger.info(f"WS client disconnected from {channel}")
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
        await redis.aclose()
