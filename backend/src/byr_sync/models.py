from dataclasses import dataclass, field


@dataclass(slots=True)
class ThreadProgress:
    board_name: str
    article_id: str
    reply_count: int
    ttl_seconds: int
    recent_post_ids: list[str] = field(default_factory=list)


@dataclass(slots=True)
class SyncPost:
    post_id: str
    floor_label: str
    author_display_name: str
    posted_at: str
    body: str


@dataclass(slots=True)
class SyncThread:
    article_id: str
    title: str
    reply_count: int
    posts: list[SyncPost] = field(default_factory=list)


@dataclass(slots=True)
class BackfillResult:
    board_name: str
    article_id: str
    start_floor: int
    posts: list[SyncPost] = field(default_factory=list)
