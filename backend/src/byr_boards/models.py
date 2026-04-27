from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class BoardThread:
    title: str
    article_url: str
    article_id: str
    state_icon: str
    post_time: str
    author: str
    reply_count: int | None
    latest_reply_time: str
    latest_reply_url: str
    latest_reply_author: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "article_url": self.article_url,
            "article_id": self.article_id,
            "state_icon": self.state_icon,
            "post_time": self.post_time,
            "author": self.author,
            "reply_count": self.reply_count,
            "latest_reply_time": self.latest_reply_time,
            "latest_reply_url": self.latest_reply_url,
            "latest_reply_author": self.latest_reply_author,
        }


@dataclass(slots=True)
class BoardPageResult:
    board_name: str
    page: int
    user_id: str
    reused_cookies: bool
    requested_url: str
    online_users: int | None
    max_online_users: int | None
    max_online_at: str
    today_post_count: int | None
    total_pages: int | None
    has_next_page: bool
    threads: list[BoardThread]

    def to_dict(self) -> dict[str, Any]:
        return {
            "board_name": self.board_name,
            "page": self.page,
            "user_id": self.user_id,
            "reused_cookies": self.reused_cookies,
            "requested_url": self.requested_url,
            "online_users": self.online_users,
            "max_online_users": self.max_online_users,
            "max_online_at": self.max_online_at,
            "today_post_count": self.today_post_count,
            "total_pages": self.total_pages,
            "has_next_page": self.has_next_page,
            "threads": [thread.to_dict() for thread in self.threads],
        }
