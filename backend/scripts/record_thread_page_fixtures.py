from __future__ import annotations

import argparse
import json
from pathlib import Path

import httpx

from byr_auth import ByrAuthClient

DEFAULT_TARGETS = ["8830220:1,2", "5738890:1"]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Record live BYR thread HTML fixtures for parser tests.",
    )
    parser.add_argument(
        "--board",
        default="IWhisper",
        help="Board name to record, default is IWhisper.",
    )
    parser.add_argument(
        "--target",
        dest="targets",
        action="append",
        default=None,
        help="Fixture target in ARTICLE_ID:PAGE1,PAGE2 format. Can be repeated.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "thread_page",
        help="Directory where the recorded HTML files will be written.",
    )
    return parser


def decode_response(response: httpx.Response) -> str:
    encoding = response.encoding or "utf-8"
    return response.content.decode(encoding)


def parse_targets(values: list[str]) -> list[tuple[str, list[int]]]:
    targets: list[tuple[str, list[int]]] = []
    for value in values:
        article_id, separator, pages_part = value.partition(":")
        if not separator or not article_id.strip() or not pages_part.strip():
            raise ValueError(f"Invalid target format: {value}")
        pages = [int(page.strip()) for page in pages_part.split(",") if page.strip()]
        if not pages:
            raise ValueError(f"Invalid target pages: {value}")
        targets.append((article_id.strip(), pages))
    return targets


def main() -> int:
    args = build_parser().parse_args()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    targets = parse_targets(args.targets or DEFAULT_TARGETS)
    client = ByrAuthClient(root_dir=Path(__file__).resolve().parents[1])
    summaries: list[dict[str, str | int]] = []

    with client.open_authenticated_client() as auth_context:
        user_id = auth_context.session.user_id
        for article_id, pages in targets:
            for page in pages:
                response = auth_context.client.get(
                    f"/article/{args.board}/{article_id}",
                    params={"p": page, "_uid": user_id},
                )
                response.raise_for_status()
                html = decode_response(response)

                file_path = output_dir / (
                    f"{args.board.lower()}_article_{article_id}_page_{page}.html"
                )
                file_path.write_text(html, encoding="utf-8")

                summaries.append(
                    {
                        "board": args.board,
                        "article_id": article_id,
                        "page": page,
                        "encoding": response.encoding or "utf-8",
                        "file": str(file_path.relative_to(output_dir.parent.parent.parent)),
                        "bytes": len(response.content),
                    }
                )

    print(json.dumps(summaries, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
