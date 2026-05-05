from __future__ import annotations

from pathlib import Path

from byr_boards.homepage_parser import parse_homepage_board_catalog


def load_fixture(name: str) -> str:
    return (
        Path(__file__).resolve().parents[2]
        / "fixtures"
        / "homepage"
        / name
    ).read_text(encoding="utf-8")


def test_parse_homepage_board_catalog_extracts_real_default_snapshot() -> None:
    html = load_fixture("byr_default.html")

    result = parse_homepage_board_catalog(html=html)

    assert len(result.sections) == 9
    assert [section.section_name for section in result.sections[:3]] == [
        "北邮校园",
        "信息社会",
        "生活时尚",
    ]
    assert len(result.sections[0].boards) == 58
    assert [board.board_name for board in result.sections[0].boards[:5]] == [
        "AcademicAffairs",
        "ACETeam",
        "AimBUPT",
        "BUPT",
        "BuptAssociation",
    ]
    assert [board.board_title for board in result.sections[0].boards[:3]] == [
        "北邮教务处",
        "ACE战队专区",
        "北邮欢迎你",
    ]
    assert [board.board_name for board in result.sections[2].boards[-3:]] == [
        "IWhisper",
        "LostandFound",
        "Talking",
    ]
    assert [board.board_title for board in result.sections[2].boards[-3:]] == [
        "悄悄话",
        "失物招领与拾金不昧",
        "谈天说地",
    ]
    assert result.sections[2].boards[-1].board_path == "/board/Talking"


def test_parse_homepage_board_catalog_extracts_sections_and_boards_in_order() -> None:
    html = """
    <html>
      <body>
        <ul id="column1" class="column">
          <li class="widget color-default" id="section-1">
            <div class="widget-head">
              <span class="widget-title"><a href="/section/1">校园生活</a></span>
            </div>
            <div class="widget-content">
              <div class="w-tab-content w-tab-1">
                <ul class="w-list-float">
                  <li title="悄悄话"><a href="/board/IWhisper">IWhisper</a></li>
                  <li title="谈天说地"><a href="/board/Talking">Talking</a></li>
                </ul>
              </div>
            </div>
          </li>
          <li class="widget color-default" id="section-2">
            <div class="widget-head">
              <span class="widget-title"><a href="/section/2">求职实习</a></span>
            </div>
            <div class="widget-content">
              <div class="w-tab-content w-tab-1">
                <ul class="w-list-float">
                  <li title="招聘信息专版"><a href="/board/JobInfo">JobInfo</a></li>
                </ul>
              </div>
            </div>
          </li>
        </ul>
      </body>
    </html>
    """

    result = parse_homepage_board_catalog(html=html)

    assert [section.section_name for section in result.sections] == ["校园生活", "求职实习"]
    assert [board.board_name for board in result.sections[0].boards] == ["IWhisper", "Talking"]
    assert [board.board_title for board in result.sections[0].boards] == ["IWhisper", "Talking"]
    assert result.sections[0].boards[0].board_path == "/board/IWhisper"
    assert [board.board_name for board in result.sections[1].boards] == ["JobInfo"]


def test_parse_homepage_board_catalog_ignores_non_board_links() -> None:
    html = """
    <html>
      <body>
        <li class="widget color-default" id="section-3">
          <div class="widget-head">
            <span class="widget-title"><a href="/section/3">测试分区</a></span>
          </div>
          <div class="widget-content">
            <div class="w-tab-content w-tab-1">
              <ul class="w-list-float">
                <li><a href="/board/IWhisper">IWhisper</a></li>
                <li><a href="/user/login">登录</a></li>
                <li><a href="https://example.com">外链</a></li>
                <li><a href="/board/">空板块</a></li>
              </ul>
            </div>
          </div>
        </li>
      </body>
    </html>
    """

    result = parse_homepage_board_catalog(html=html)

    assert len(result.sections) == 1
    assert [board.board_name for board in result.sections[0].boards] == ["IWhisper"]
    assert [board.board_title for board in result.sections[0].boards] == ["IWhisper"]
    assert [board.board_path for board in result.sections[0].boards] == ["/board/IWhisper"]
