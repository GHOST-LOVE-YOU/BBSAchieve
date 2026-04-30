from __future__ import annotations

import argparse
import json

from byr_auth import AuthError, ByrAuthClient
from byr_boards import BoardService
from byr_threads import ThreadService


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minimal BYR BBS collection backend")
    subparsers = parser.add_subparsers(dest="command", required=False)

    subparsers.add_parser("status", help="Check current login status using saved cookies")

    login_parser = subparsers.add_parser(
        "login",
        help="Reuse saved cookies when valid, otherwise login and save cookies",
    )
    login_parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore saved login state and perform a fresh login",
    )

    board_parser = subparsers.add_parser(
        "board",
        help="Fetch a board page and print structured thread data",
    )
    board_parser.add_argument(
        "--name",
        default="IWhisper",
        help="Board name, default is IWhisper",
    )
    board_parser.add_argument(
        "--page",
        type=int,
        default=1,
        help="Board page number, default is 1",
    )
    board_parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore saved login state and perform a fresh login before fetching",
    )

    thread_parser = subparsers.add_parser(
        "thread",
        help="Fetch a thread page and print structured post data",
    )
    thread_parser.add_argument(
        "--board",
        default="IWhisper",
        help="Board name, default is IWhisper",
    )
    thread_parser.add_argument(
        "--article-id",
        required=True,
        help="Thread article ID to fetch",
    )
    thread_parser.add_argument(
        "--page",
        type=int,
        default=1,
        help="Thread page number, default is 1",
    )
    thread_parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore saved login state and perform a fresh login before fetching",
    )

    subparsers.add_parser("cookies", help="Print the locally saved cookies file")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    command = args.command or "login"
    client = ByrAuthClient()
    board_service = BoardService(client)
    thread_service = ThreadService(client)

    try:
        if command == "status":
            result = client.check_status().to_dict()
        elif command == "login":
            result = client.ensure_login(force_relogin=args.force).to_dict()
        elif command == "board":
            result = board_service.fetch_page(
                board_name=args.name,
                page=args.page,
                force_relogin=args.force,
            ).to_dict()
        elif command == "thread":
            result = thread_service.fetch_page(
                board_name=args.board,
                article_id=args.article_id,
                page=args.page,
                force_relogin=args.force,
            ).to_dict()
        elif command == "cookies":
            result = {"cookies": client.cookie_store.serialize(client.cookie_store.load())}
        else:
            parser.error(f"Unknown command: {command}")
            return 2
    except AuthError as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False, indent=2))
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0
