from __future__ import annotations

from pathlib import Path

from byr_boards.parser import parse_board_page


def load_fixture(name: str) -> str:
    return (
        Path(__file__).resolve().parents[2]
        / "fixtures"
        / "board_page"
        / name
    ).read_text(encoding="utf-8")


def test_parse_board_page_extracts_real_first_page_snapshot() -> None:
    html = load_fixture("iwhisper_page_1.html")

    result = parse_board_page(
        html=html,
        board_name="IWhisper",
        page=1,
        user_id="fixture-user",
        reused_cookies=True,
        requested_url="https://bbs.byr.cn/board/IWhisper?p=1&_uid=fixture-user",
    )

    assert result.board_name == "IWhisper"
    assert result.page == 1
    assert result.user_id == "fixture-user"
    assert result.reused_cookies is True
    assert result.online_users is not None
    assert result.online_users > 0
    assert result.max_online_users == 6709
    assert result.today_post_count is not None
    assert result.today_post_count > 0
    assert result.total_pages == 134
    assert result.has_next_page is True
    assert len(result.threads) == 21

    first_thread = result.threads[0]
    assert first_thread.title == "今年被打C的概率有1/5吗？"
    assert first_thread.article_id == "8840031"
    assert first_thread.state_icon == "tag ico-pos-article-light"
    assert first_thread.author == "IWhisper#383"
    assert first_thread.reply_count == 10
    assert first_thread.latest_reply_url.endswith("/8840031?p=2#a10")
    assert first_thread.latest_reply_author == "IWhisper#737"

    last_thread = result.threads[-1]
    assert last_thread.article_id == "8830220"
    assert last_thread.author.startswith("IWhisper#")
    assert last_thread.reply_count == 27
    assert last_thread.latest_reply_author.startswith("IWhisper#")


def test_parse_board_page_can_include_sticky_threads() -> None:
    html = load_fixture("iwhisper_page_1.html")

    result = parse_board_page(
        html=html,
        board_name="IWhisper",
        page=1,
        user_id="fixture-user",
        reused_cookies=True,
        requested_url="https://bbs.byr.cn/board/IWhisper?p=1&_uid=fixture-user",
        include_sticky_threads=True,
    )

    assert len(result.threads) == 30
    assert result.threads[0].title.startswith("【提醒】禁止广告")
    assert result.threads[0].article_id == "5738890"
    assert result.threads[0].state_icon == "tag ico-pos-article-top"


def test_parse_board_page_extracts_real_last_page_snapshot() -> None:
    html = load_fixture("iwhisper_page_134.html")

    result = parse_board_page(
        html=html,
        board_name="IWhisper",
        page=134,
        user_id="fixture-user",
        reused_cookies=False,
        requested_url="https://bbs.byr.cn/board/IWhisper?p=134&_uid=fixture-user",
    )

    assert result.page == 134
    assert result.reused_cookies is False
    assert result.total_pages == 134
    assert result.has_next_page is False
    assert len(result.threads) == 26

    first_thread = result.threads[0]
    assert first_thread.title == "我恨我的女朋友"
    assert first_thread.article_id == "524657"
    assert first_thread.state_icon == "tag ico-pos-article-m"
    assert first_thread.author == "IWhisper"

    last_thread = result.threads[-1]
    assert last_thread.title == "本版主题以及版规"
    assert last_thread.article_id == "13"
    assert last_thread.author == "cher"


def test_parse_board_page_handles_missing_optional_sections() -> None:
    result = parse_board_page(
        html="<html><body><table class='board-list'><tbody></tbody></table></body></html>",
        board_name="IWhisper",
        page=2,
        user_id="24",
        reused_cookies=False,
        requested_url="https://bbs.byr.cn/board/IWhisper?p=2&_uid=24",
    )

    assert result.online_users is None
    assert result.max_online_users is None
    assert result.max_online_at == ""
    assert result.today_post_count is None
    assert result.total_pages is None
    assert result.has_next_page is False
    assert result.threads == []
