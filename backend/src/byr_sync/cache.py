from dataclasses import dataclass, field
from os import getenv
from pathlib import Path

from dotenv import dotenv_values
from redis import Redis

from .models import ThreadProgress

DEFAULT_ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_ENV_PATH = DEFAULT_ROOT_DIR / ".env"
DEFAULT_REDIS_URL = "redis://127.0.0.1:6379/0"
THREAD_TTL_SECONDS = 3 * 24 * 60 * 60
THREAD_PROGRESS_KEY_PREFIX = "sync:thread"


def load_sync_redis_url(
    *,
    root_dir: Path | None = None,
    env_path: Path | None = None,
) -> str:
    redis_url = getenv("BYR_SYNC_REDIS_URL")
    if redis_url:
        return redis_url

    resolved_env_path = env_path or (root_dir / ".env" if root_dir is not None else DEFAULT_ENV_PATH)
    env_values = dotenv_values(resolved_env_path)
    env_redis_url = env_values.get("BYR_SYNC_REDIS_URL")
    return str(env_redis_url) if env_redis_url else DEFAULT_REDIS_URL


@dataclass(slots=True)
class InMemorySyncCache:
    _thread_progress: dict[str, ThreadProgress] = field(default_factory=dict)

    def save_thread_progress(
        self,
        board_name: str,
        article_id: str,
        reply_count: int,
        recent_post_ids: list[str] | None = None,
    ) -> ThreadProgress:
        copied_recent_post_ids = list(recent_post_ids or [])
        progress = ThreadProgress(
            board_name=board_name,
            article_id=article_id,
            reply_count=reply_count,
            ttl_seconds=THREAD_TTL_SECONDS,
            recent_post_ids=copied_recent_post_ids,
        )
        self._thread_progress[f"{board_name}:{article_id}"] = progress
        return progress

    def get_thread_progress(self, *, board_name: str, article_id: str) -> ThreadProgress | None:
        return self._thread_progress.get(f"{board_name}:{article_id}")


@dataclass(slots=True)
class RedisSyncCache:
    redis: Redis

    @classmethod
    def from_env(
        cls,
        *,
        root_dir: Path | None = None,
        env_path: Path | None = None,
    ) -> "RedisSyncCache":
        redis_url = load_sync_redis_url(root_dir=root_dir, env_path=env_path)
        redis_client = Redis.from_url(redis_url, decode_responses=True)
        return cls(redis=redis_client)

    @staticmethod
    def _thread_key(*, board_name: str, article_id: str) -> str:
        return f"{THREAD_PROGRESS_KEY_PREFIX}:{board_name}:{article_id}"

    @staticmethod
    def thread_progress_pattern(*, board_name: str | None = None) -> str:
        if board_name is None:
            return f"{THREAD_PROGRESS_KEY_PREFIX}:*"
        return f"{THREAD_PROGRESS_KEY_PREFIX}:{board_name}:*"

    def save_thread_progress(
        self,
        board_name: str,
        article_id: str,
        reply_count: int,
        recent_post_ids: list[str] | None = None,
    ) -> ThreadProgress:
        copied_recent_post_ids = list(recent_post_ids or [])
        progress = ThreadProgress(
            board_name=board_name,
            article_id=article_id,
            reply_count=reply_count,
            ttl_seconds=THREAD_TTL_SECONDS,
            recent_post_ids=copied_recent_post_ids,
        )
        self.redis.hset(
            self._thread_key(board_name=board_name, article_id=article_id),
            mapping={
                "board_name": board_name,
                "article_id": article_id,
                "reply_count": reply_count,
                "ttl_seconds": THREAD_TTL_SECONDS,
                "recent_post_ids": ",".join(copied_recent_post_ids),
            },
        )
        self.redis.expire(
            self._thread_key(board_name=board_name, article_id=article_id),
            THREAD_TTL_SECONDS,
        )
        return progress

    def get_thread_progress(self, *, board_name: str, article_id: str) -> ThreadProgress | None:
        data = self.redis.hgetall(self._thread_key(board_name=board_name, article_id=article_id))
        if not data:
            return None
        recent_post_ids = data.get("recent_post_ids", "")
        return ThreadProgress(
            board_name=data.get("board_name", board_name),
            article_id=data.get("article_id", article_id),
            reply_count=int(data.get("reply_count", "0")),
            ttl_seconds=int(data.get("ttl_seconds", str(THREAD_TTL_SECONDS))),
            recent_post_ids=[post_id for post_id in recent_post_ids.split(",") if post_id],
        )

    def clear_thread_progress(self, *, board_name: str | None = None) -> int:
        pattern = self.thread_progress_pattern(board_name=board_name)
        pending_keys: list[str] = []
        deleted_keys = 0

        for key in self.redis.scan_iter(match=pattern):
            pending_keys.append(key)
            if len(pending_keys) >= 100:
                deleted_keys += int(self.redis.delete(*pending_keys))
                pending_keys.clear()

        if pending_keys:
            deleted_keys += int(self.redis.delete(*pending_keys))

        return deleted_keys

    def clear_database(self) -> int:
        deleted_keys = int(self.redis.dbsize())
        self.redis.flushdb()
        return deleted_keys
