from __future__ import annotations

from urllib.parse import urlparse

from bs4 import BeautifulSoup

from .homepage_models import HomepageBoardCatalog, HomepageBoardEntry, HomepageBoardSection


def parse_homepage_board_catalog(*, html: str) -> HomepageBoardCatalog:
    soup = BeautifulSoup(html, "html.parser")
    sections: list[HomepageBoardSection] = []

    for section_node in soup.select("li.widget"):
        title_node = section_node.select_one(".widget-title")
        section_name = title_node.get_text(" ", strip=True) if title_node else ""
        boards: list[HomepageBoardEntry] = []

        for anchor in section_node.select(".w-tab-content .w-list-float a[href]"):
            href = anchor.get("href", "").strip()
            if not href.startswith("/board/"):
                continue
            board_title = anchor.get_text(" ", strip=True)
            board_path = urlparse(href).path
            board_name = board_path.rsplit("/", 1)[-1]
            if (
                board_title == ""
                or board_name == ""
                or board_path == ""
                or board_path == "/board/"
                or board_path.count("/") < 2
            ):
                continue
            boards.append(
                HomepageBoardEntry(
                    board_name=board_name,
                    board_title=board_title,
                    board_path=board_path,
                )
            )

        if section_name and boards:
            sections.append(
                HomepageBoardSection(
                    section_name=section_name,
                    boards=boards,
                )
            )

    return HomepageBoardCatalog(sections=sections)
