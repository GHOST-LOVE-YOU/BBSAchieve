from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class HomepageBoardEntry:
    board_name: str
    board_title: str
    board_path: str


@dataclass(slots=True)
class HomepageBoardSection:
    section_name: str
    boards: list[HomepageBoardEntry]


@dataclass(slots=True)
class HomepageBoardCatalog:
    sections: list[HomepageBoardSection]
