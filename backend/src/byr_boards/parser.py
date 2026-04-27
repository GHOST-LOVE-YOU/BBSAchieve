from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from .models import BoardPageResult, BoardThread

BASE_URL = "https://bbs.byr.cn"


def parse_board_page(
    *,
    html: str,
    board_name: str,
    page: int,
    user_id: str,
    reused_cookies: bool,
    requested_url: str,
) -> BoardPageResult:
    soup = BeautifulSoup(html, "html.parser")

    head_left = soup.select_one(".b-head .n-left")
    head_text = head_left.get_text(" ", strip=True) if head_left else ""
    max_online_node = head_left.find("span", title=True) if head_left else None

    online_users = _search_int(r"本版当前共有(\d+)人在线", head_text)
    max_online_users = _search_int(r"最高(\d+)人", head_text)
    today_post_count = _search_int(r"今日帖数(\d+)", head_text)
    max_online_at = max_online_node.get("title", "") if max_online_node else ""

    page_numbers = [
        int(node.get_text(strip=True))
        for node in soup.select(".page-main li a")
        if node.get_text(strip=True).isdigit()
    ]
    total_pages = max(page_numbers) if page_numbers else None
    has_next_page = soup.select_one('a[title="下一页"]') is not None

    threads: list[BoardThread] = []
    for row in soup.select(".board-list tbody tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 7:
            continue

        (
            state_cell,
            title_cell,
            post_time_cell,
            author_cell,
            reply_cell,
            latest_time_cell,
            latest_author_cell,
        ) = cells[:7]
        title_anchor = title_cell.find("a")
        if title_anchor is None:
            continue

        article_href = title_anchor.get("href", "").strip()
        latest_reply_anchor = latest_time_cell.find("a")
        article_url = urljoin(BASE_URL, article_href)
        latest_reply_url = urljoin(
            BASE_URL,
            latest_reply_anchor.get("href", "").strip() if latest_reply_anchor else "",
        )
        article_id = Path(urlparse(article_url).path).name

        reply_text = reply_cell.get_text(strip=True)
        reply_count = int(reply_text) if reply_text.isdigit() else None
        state_icon_node = state_cell.find("samp")
        state_icon = ""
        if state_icon_node is not None:
            state_icon = " ".join(state_icon_node.get("class", []))

        threads.append(
            BoardThread(
                title=title_anchor.get_text(" ", strip=True),
                article_url=article_url,
                article_id=article_id,
                state_icon=state_icon,
                post_time=post_time_cell.get_text(" ", strip=True),
                author=_clean_cell_text(author_cell.get_text(" ", strip=True)),
                reply_count=reply_count,
                latest_reply_time=latest_time_cell.get_text(" ", strip=True),
                latest_reply_url=latest_reply_url,
                latest_reply_author=_clean_cell_text(
                    latest_author_cell.get_text(" ", strip=True)
                ),
            )
        )

    return BoardPageResult(
        board_name=board_name,
        page=page,
        user_id=user_id,
        reused_cookies=reused_cookies,
        requested_url=requested_url,
        online_users=online_users,
        max_online_users=max_online_users,
        max_online_at=max_online_at,
        today_post_count=today_post_count,
        total_pages=total_pages,
        has_next_page=has_next_page,
        threads=threads,
    )


def _search_int(pattern: str, text: str) -> int | None:
    match = re.search(pattern, text)
    if match is None:
        return None
    return int(match.group(1))


def _clean_cell_text(text: str) -> str:
    return text.lstrip("| ").strip()
