from __future__ import annotations

from pathlib import Path

from byr_threads.parser import parse_thread_page


def load_fixture(name: str) -> str:
    return (
        Path(__file__).resolve().parents[2]
        / "fixtures"
        / "thread_page"
        / name
    ).read_text(encoding="utf-8")


def test_parse_thread_page_extracts_anonymous_multi_page_snapshot() -> None:
    html = load_fixture("iwhisper_article_8830220_page_1.html")

    result = parse_thread_page(
        html=html,
        board_name="IWhisper",
        article_id="8830220",
        page=1,
        user_id="fixture-user",
        reused_cookies=True,
        requested_url="https://bbs.byr.cn/article/IWhisper/8830220?p=1&_uid=fixture-user",
    )

    assert result.board_name == "IWhisper"
    assert result.article_id == "8830220"
    assert result.page == 1
    assert result.user_id == "fixture-user"
    assert result.reused_cookies is True
    assert result.thread_title == "暑期大调查，给大家磕一个"
    assert result.post_count == 28
    assert result.total_pages == 3
    assert result.has_next_page is True
    assert len(result.posts) == 10

    first_post = result.posts[0]
    assert first_post.post_id == "8830220"
    assert first_post.floor_label == "楼主"
    assert first_post.is_original_post is True
    assert first_post.author_display_name == "IWhisper#796"
    assert first_post.is_anonymous is True
    assert first_post.anonymous_id == 796
    assert first_post.posted_at == "Sat Apr 25 18:07:24 2026"
    assert first_post.title == "暑期大调查，给大家磕一个"
    assert first_post.body.startswith("想收集下大家的情况")

    last_post = result.posts[-1]
    assert last_post.post_id == "8831211"
    assert last_post.floor_label == "第9楼"
    assert last_post.is_original_post is False
    assert last_post.author_display_name == "IWhisper#897"
    assert last_post.anonymous_id == 897
    assert last_post.body == "t"


def test_parse_thread_page_extracts_middle_page_snapshot() -> None:
    html = load_fixture("iwhisper_article_8830220_page_2.html")

    result = parse_thread_page(
        html=html,
        board_name="IWhisper",
        article_id="8830220",
        page=2,
        user_id="fixture-user",
        reused_cookies=False,
        requested_url="https://bbs.byr.cn/article/IWhisper/8830220?p=2&_uid=fixture-user",
    )

    assert result.page == 2
    assert result.reused_cookies is False
    assert result.post_count == 28
    assert result.total_pages == 3
    assert result.has_next_page is True
    assert len(result.posts) == 10

    first_post = result.posts[0]
    assert first_post.post_id == "8831255"
    assert first_post.floor_label == "第10楼"
    assert first_post.is_original_post is False
    assert first_post.author_display_name == "IWhisper#920"
    assert first_post.anonymous_id == 920
    assert first_post.title == "Re: 暑期大调查，给大家磕一个"
    assert "【 在 IWhisper#43 的大作中提到: 】" in first_post.body

    last_post = result.posts[-1]
    assert last_post.post_id == "8834081"
    assert last_post.floor_label == "第19楼"
    assert last_post.author_display_name == "IWhisper#73"
    assert last_post.anonymous_id == 73
    assert last_post.body == "bd"


def test_parse_thread_page_extracts_named_single_page_snapshot() -> None:
    html = load_fixture("iwhisper_article_5738890_page_1.html")

    result = parse_thread_page(
        html=html,
        board_name="IWhisper",
        article_id="5738890",
        page=1,
        user_id="fixture-user",
        reused_cookies=True,
        requested_url="https://bbs.byr.cn/article/IWhisper/5738890?p=1&_uid=fixture-user",
    )

    assert result.thread_title == "【提醒】禁止广告、拼车、征友、留联系方式、二手交易等商业或宣传信息"
    assert result.post_count == 1
    assert result.total_pages == 1
    assert result.has_next_page is False
    assert len(result.posts) == 1

    post = result.posts[0]
    assert post.post_id == "5738890"
    assert post.floor_label == "楼主"
    assert post.is_original_post is True
    assert post.author_display_name == "houjian0520"
    assert post.is_anonymous is False
    assert post.anonymous_id is None
    assert post.posted_at == "Wed May 17 23:47:07 2023"
    assert post.body.startswith("相关提醒公告合集整理")


def test_parse_thread_page_handles_missing_optional_sections() -> None:
    html = """
    <html>
      <body>
        <div class="b-content">
          <table class="article">
            <tr class="a-head">
              <td class="a-left"><span class="a-u-name">IWhisper#1</span></td>
              <td><span class="a-pos">楼主</span></td>
            </tr>
            <tr class="a-body">
              <td></td>
              <td class="a-content"><div class="a-content-wrap">
发信人: IWhisper#1 (test), 信区: IWhisper
标  题: 题目
发信站: 北邮人论坛 (Fri Apr 25 18:07:24 2026), 站内

正文第一行
正文第二行
--
              </div></td>
            </tr>
          </table>
        </div>
      </body>
    </html>
    """

    result = parse_thread_page(
        html=html,
        board_name="IWhisper",
        article_id="1",
        page=1,
        user_id="fixture-user",
        reused_cookies=False,
        requested_url="https://bbs.byr.cn/article/IWhisper/1?p=1&_uid=fixture-user",
    )

    assert result.thread_title == "题目"
    assert result.post_count is None
    assert result.total_pages == 1
    assert result.has_next_page is False
    assert len(result.posts) == 1
    assert result.posts[0].anonymous_id == 1
    assert result.posts[0].body == "正文第一行\n正文第二行"


def test_parse_thread_page_preserves_re_prefix_when_thread_title_is_missing() -> None:
    html = """
    <html>
      <body>
        <div class="b-content">
          <table class="article">
            <tr class="a-head">
              <td class="a-left"><span class="a-u-name">IWhisper#2</span></td>
              <td>
                <ul class="a-func">
                  <li><a class="a-post" href="/article/IWhisper/post/200">回复</a></li>
                </ul>
                <span class="a-pos">第12楼</span>
              </td>
            </tr>
            <tr class="a-body">
              <td></td>
              <td class="a-content"><div class="a-content-wrap">
发信人: IWhisper#2 (test), 信区: IWhisper
标  题: Re: 原帖已删除后的异常标题
发信站: 北邮人论坛 (Fri Apr 25 18:07:24 2026), 站内

正文
--
              </div></td>
            </tr>
          </table>
        </div>
      </body>
    </html>
    """

    result = parse_thread_page(
        html=html,
        board_name="IWhisper",
        article_id="100",
        page=2,
        user_id="fixture-user",
        reused_cookies=False,
        requested_url="https://bbs.byr.cn/article/IWhisper/100?p=2&_uid=fixture-user",
    )

    assert result.thread_title == "Re: 原帖已删除后的异常标题"
