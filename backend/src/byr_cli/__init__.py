from __future__ import annotations

import argparse
import json

from redis.exceptions import RedisError

from byr_auth import AuthError, ByrAuthClient
from byr_boards import BoardService
from byr_sync.cache import RedisSyncCache
from byr_threads import ThreadService


def add_clear_sync_cache_arguments(parser: argparse.ArgumentParser) -> None:
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--board",
        help="Only clear one board's sync cache keys",
    )
    group.add_argument(
        "--all",
        action="store_true",
        help="Flush the current Redis database instead of only sync cache keys",
    )


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
    board_parser.add_argument(
        "--include-sticky",
        action="store_true",
        help="Include sticky threads in board results",
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

    clear_sync_cache_parser = subparsers.add_parser(
        "clear-sync-cache",
        help="Clear Redis sync cache keys",
    )
    add_clear_sync_cache_arguments(clear_sync_cache_parser)
    return parser


def build_clear_sync_cache_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Clear Redis sync cache")
    add_clear_sync_cache_arguments(parser)
    return parser


def clear_sync_cache(
    *,
    cache: RedisSyncCache | None = None,
    board_name: str | None = None,
    clear_all: bool = False,
) -> dict[str, object]:
    sync_cache = cache or RedisSyncCache.from_env()

    if clear_all:
        return {
            "scope": "database",
            "deleted_keys": sync_cache.clear_database(),
        }

    result: dict[str, object] = {
        "scope": "thread_progress",
        "pattern": RedisSyncCache.thread_progress_pattern(board_name=board_name),
        "deleted_keys": sync_cache.clear_thread_progress(board_name=board_name),
    }
    if board_name is not None:
        result["board_name"] = board_name
    return result


def _print_json(payload: dict[str, object]) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def clear_sync_cache_main() -> int:
    parser = build_clear_sync_cache_parser()
    args = parser.parse_args()

    try:
        result = clear_sync_cache(
            board_name=args.board,
            clear_all=args.all,
        )
    except RedisError as exc:
        _print_json({"error": str(exc)})
        return 1

    _print_json(result)
    return 0


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    command = args.command or "login"

    try:
        if command == "status":
            client = ByrAuthClient()
            result = client.check_status().to_dict()
        elif command == "login":
            client = ByrAuthClient()
            result = client.ensure_login(force_relogin=args.force).to_dict()
        elif command == "board":
            client = ByrAuthClient()
            board_service = BoardService(client)
            result = board_service.fetch_page(
                board_name=args.name,
                page=args.page,
                force_relogin=args.force,
                include_sticky_threads=args.include_sticky,
            ).to_dict()
        elif command == "thread":
            client = ByrAuthClient()
            thread_service = ThreadService(client)
            result = thread_service.fetch_page(
                board_name=args.board,
                article_id=args.article_id,
                page=args.page,
                force_relogin=args.force,
            ).to_dict()
        elif command == "cookies":
            client = ByrAuthClient()
            result = {"cookies": client.cookie_store.serialize(client.cookie_store.load())}
        elif command == "clear-sync-cache":
            result = clear_sync_cache(
                board_name=args.board,
                clear_all=args.all,
            )
        else:
            parser.error(f"Unknown command: {command}")
            return 2
    except (AuthError, RedisError) as exc:
        _print_json({"error": str(exc)})
        return 1

    _print_json(result)
    return 0
