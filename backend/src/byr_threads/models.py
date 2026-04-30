from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class ThreadPost:
    post_id: str
    floor_label: str
    is_original_post: bool
    author_display_name: str
    is_anonymous: bool
    anonymous_id: int | None
    posted_at: str
    title: str
    body: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "post_id": self.post_id,
            "floor_label": self.floor_label,
            "is_original_post": self.is_original_post,
            "author_display_name": self.author_display_name,
            "is_anonymous": self.is_anonymous,
            "anonymous_id": self.anonymous_id,
            "posted_at": self.posted_at,
            "title": self.title,
            "body": self.body,
        }


@dataclass(slots=True)
class ThreadPageResult:
    board_name: str
    article_id: str
    page: int
    user_id: str
    reused_cookies: bool
    requested_url: str
    thread_title: str
    post_count: int | None
    total_pages: int
    has_next_page: bool
    posts: list[ThreadPost]

    def to_dict(self) -> dict[str, Any]:
        return {
            "board_name": self.board_name,
            "article_id": self.article_id,
            "page": self.page,
            "user_id": self.user_id,
            "reused_cookies": self.reused_cookies,
            "requested_url": self.requested_url,
            "thread_title": self.thread_title,
            "post_count": self.post_count,
            "total_pages": self.total_pages,
            "has_next_page": self.has_next_page,
            "posts": [post.to_dict() for post in self.posts],
        }
