from __future__ import annotations

import re
from typing import Iterable

from bs4 import BeautifulSoup
from bs4.element import NavigableString, Tag

from .models import ThreadPageResult, ThreadPost

THREAD_TITLE_PREFIX = "文章主题:"
AUTHOR_PATTERN_TEMPLATE = r"^{board_name}#(\d{{1,3}})$"


def parse_thread_page(
    *,
    html: str,
    board_name: str,
    article_id: str,
    page: int,
    user_id: str,
    reused_cookies: bool,
    requested_url: str,
) -> ThreadPageResult:
    soup = BeautifulSoup(html, "html.parser")

    page_numbers = [
        int(node.get_text(strip=True))
        for node in soup.select(".page-main li a")
        if node.get_text(strip=True).isdigit()
    ]
    total_pages = max(page_numbers) if page_numbers else 1
    has_next_page = soup.select_one('a[title="下一页"]') is not None

    page_pre = soup.select_one(".page-pre")
    post_count_text = page_pre.get_text(" ", strip=True) if page_pre else ""
    post_count = _search_int(r"贴数:\s*(\d+)", post_count_text)

    posts = [
        post
        for article_node in soup.select(".article")
        if (post := _parse_post(article_node, board_name=board_name, article_id=article_id))
        is not None
    ]

    thread_title = _extract_thread_title(soup)
    if posts and posts[0].is_original_post and len(posts[0].title) >= len(thread_title):
        thread_title = posts[0].title
    if not thread_title and posts:
        thread_title = posts[0].title

    return ThreadPageResult(
        board_name=board_name,
        article_id=article_id,
        page=page,
        user_id=user_id,
        reused_cookies=reused_cookies,
        requested_url=requested_url,
        thread_title=thread_title,
        post_count=post_count,
        total_pages=total_pages,
        has_next_page=has_next_page,
        posts=posts,
    )


def _parse_post(
    article_node: Tag,
    *,
    board_name: str,
    article_id: str,
) -> ThreadPost | None:
    author_node = article_node.select_one(".a-u-name")
    floor_node = article_node.select_one(".a-pos")
    content_node = article_node.select_one(".a-content-wrap")
    if author_node is None or floor_node is None or content_node is None:
        return None

    author_display_name = _normalize_inline_text(author_node.get_text(" ", strip=True))
    floor_label = _normalize_inline_text(floor_node.get_text(" ", strip=True))
    post_id = _extract_post_id(article_node)

    lines = _extract_content_lines(content_node)
    title = _extract_first_match(lines, r"^标\s*题:\s*(.*)$")
    posted_at = _extract_first_match(lines, r"^发信站:\s*北邮人论坛\s*\((.*?)\)(?:,\s*站内)?$")
    body = _extract_body(lines)
    anonymous_id = _extract_anonymous_id(author_display_name, board_name)

    return ThreadPost(
        post_id=post_id,
        floor_label=floor_label,
        is_original_post=post_id == article_id or floor_label == "楼主",
        author_display_name=author_display_name,
        is_anonymous=anonymous_id is not None,
        anonymous_id=anonymous_id,
        posted_at=posted_at,
        title=title,
        body=body,
    )


def _extract_post_id(article_node: Tag) -> str:
    reply_link = article_node.select_one('.a-post[href*="/post/"]')
    href = reply_link.get("href", "") if reply_link else ""
    match = re.search(r"/post/(\d+)", href)
    if match is not None:
        return match.group(1)

    for selector in ('.a-func-support[href$=".json"]', '.a-func-forward[href$=".json"]'):
        link = article_node.select_one(selector)
        href = link.get("href", "") if link else ""
        match = re.search(r"/(\d+)\.json$", href)
        if match is not None:
            return match.group(1)
    return ""


def _extract_content_lines(content_node: Tag) -> list[str]:
    text = _serialize_content_text(content_node)
    lines = [_normalize_line(line) for line in text.splitlines()]

    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return lines


def _serialize_content_text(content_node: Tag) -> str:
    chunks: list[str] = []
    for node in content_node.descendants:
        if isinstance(node, NavigableString):
            chunks.append(str(node))
        elif isinstance(node, Tag) and node.name == "br":
            chunks.append("\n")
        elif isinstance(node, Tag) and node.name == "img":
            if token := _extract_inline_image_token(node):
                chunks.append(token)
    return "".join(chunks)


def _extract_inline_image_token(image_node: Tag) -> str:
    alt = str(image_node.get("alt", "")).strip()
    if re.fullmatch(r"(?:em|ema)\d+", alt):
        return f"[{alt}]"
    return ""


def _extract_body(lines: list[str]) -> str:
    start_index = 0
    for index, line in enumerate(lines):
        if line.startswith("发信站:"):
            start_index = index + 1
            break

    body_lines: list[str] = []
    started = False
    for line in lines[start_index:]:
        if not started and not line:
            continue
        if line == "--" or line.startswith("※ 来源:") or line.startswith("※ 修改:"):
            break
        started = True
        body_lines.append(line)

    while body_lines and not body_lines[-1]:
        body_lines.pop()
    return "\n".join(body_lines)


def _extract_first_match(lines: Iterable[str], pattern: str) -> str:
    compiled = re.compile(pattern)
    for line in lines:
        match = compiled.match(line)
        if match is not None:
            return match.group(1).strip()
    return ""


def _extract_thread_title(soup: BeautifulSoup) -> str:
    title_node = soup.select_one(".b-head .n-left")
    if title_node is None:
        return ""
    title_text = _normalize_inline_text(title_node.get_text(" ", strip=True))
    if title_text.startswith(THREAD_TITLE_PREFIX):
        return title_text.removeprefix(THREAD_TITLE_PREFIX).strip()
    return title_text


def _extract_anonymous_id(author_display_name: str, board_name: str) -> int | None:
    pattern = AUTHOR_PATTERN_TEMPLATE.format(board_name=re.escape(board_name))
    match = re.match(pattern, author_display_name)
    if match is None:
        return None
    return int(match.group(1))


def _search_int(pattern: str, text: str) -> int | None:
    match = re.search(pattern, text)
    if match is None:
        return None
    return int(match.group(1))
def _normalize_line(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


def _normalize_inline_text(text: str) -> str:
    return _normalize_line(text)
