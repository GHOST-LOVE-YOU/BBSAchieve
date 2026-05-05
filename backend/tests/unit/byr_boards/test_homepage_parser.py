from __future__ import annotations

from byr_boards.homepage_parser import parse_homepage_board_catalog


def test_parse_homepage_board_catalog_extracts_sections_and_boards_in_order() -> None:
    html = """
    <html>
      <body>
        <section class="forum-section">
          <h2>校园生活</h2>
          <div class="boards">
            <a href="/board/IWhisper">IWhisper</a>
            <a href="/board/Talking">Talking</a>
          </div>
        </section>
        <section class="forum-section">
          <h2>求职实习</h2>
          <div class="boards">
            <a href="/board/JobInfo">JobInfo</a>
          </div>
        </section>
      </body>
    </html>
    """

    result = parse_homepage_board_catalog(html=html)

    assert [section.section_name for section in result.sections] == ["校园生活", "求职实习"]
    assert [board.board_name for board in result.sections[0].boards] == ["IWhisper", "Talking"]
    assert result.sections[0].boards[0].board_path == "/board/IWhisper"
    assert [board.board_name for board in result.sections[1].boards] == ["JobInfo"]


def test_parse_homepage_board_catalog_ignores_non_board_links() -> None:
    html = """
    <html>
      <body>
        <div class="forum-section">
          <h2>测试分区</h2>
          <a href="/board/IWhisper">IWhisper</a>
          <a href="/user/login">登录</a>
          <a href="https://example.com">外链</a>
          <a href="/board/">空板块</a>
        </div>
      </body>
    </html>
    """

    result = parse_homepage_board_catalog(html=html)

    assert len(result.sections) == 1
    assert [board.board_name for board in result.sections[0].boards] == ["IWhisper"]
    assert [board.board_path for board in result.sections[0].boards] == ["/board/IWhisper"]
