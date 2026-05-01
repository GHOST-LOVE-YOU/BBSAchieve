from dataclasses import dataclass, field


@dataclass(slots=True)
class ThreadProgress:
    board_name: str
    article_id: int
    reply_count: int
    ttl_seconds: int
    recent_post_ids: list[str] = field(default_factory=list)
