from dataclasses import dataclass, field

from .models import ThreadProgress

THREAD_TTL_SECONDS = 3 * 24 * 60 * 60


@dataclass(slots=True)
class InMemorySyncCache:
    thread_progress: dict[str, ThreadProgress] = field(default_factory=dict)

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
        self.thread_progress[f"{board_name}:{article_id}"] = progress
        return progress
