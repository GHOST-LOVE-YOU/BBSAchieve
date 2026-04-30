from __future__ import annotations

import argparse
import json
from pathlib import Path

import httpx

from byr_auth import ByrAuthClient

DEFAULT_PAGES = [1, 134]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Record live BYR board HTML fixtures for parser tests.",
    )
    parser.add_argument(
        "--board",
        default="IWhisper",
        help="Board name to record, default is IWhisper.",
    )
    parser.add_argument(
        "--pages",
        nargs="+",
        type=int,
        default=DEFAULT_PAGES,
        help="Page numbers to record, default is 1 134.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "board_page",
        help="Directory where the recorded HTML files will be written.",
    )
    return parser


def decode_response(response: httpx.Response) -> str:
    encoding = response.encoding or "gb18030"
    return response.content.decode(encoding)


def main() -> int:
    args = build_parser().parse_args()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    client = ByrAuthClient(root_dir=Path(__file__).resolve().parents[1])
    summaries: list[dict[str, str | int]] = []

    with client.open_authenticated_client() as auth_context:
        user_id = auth_context.session.user_id
        for page in args.pages:
            response = auth_context.client.get(
                f"/board/{args.board}",
                params={"p": page, "_uid": user_id},
            )
            response.raise_for_status()
            html = decode_response(response)

            file_path = output_dir / f"{args.board.lower()}_page_{page}.html"
            file_path.write_text(html, encoding="utf-8")

            summaries.append(
                {
                    "board": args.board,
                    "page": page,
                    "encoding": response.encoding or "gb18030",
                    "file": str(file_path.relative_to(output_dir.parent.parent.parent)),
                    "bytes": len(response.content),
                }
            )

    print(json.dumps(summaries, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
