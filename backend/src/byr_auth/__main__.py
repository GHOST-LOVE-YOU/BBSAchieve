from __future__ import annotations

import argparse
import json

from .client import AuthError, ByrAuthClient


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minimal BYR BBS auth client")
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

    subparsers.add_parser("cookies", help="Print the locally saved cookies file")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    command = args.command or "login"
    client = ByrAuthClient()

    try:
        if command == "status":
            result = client.check_status().to_dict()
        elif command == "login":
            result = client.ensure_login(force_relogin=args.force).to_dict()
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


if __name__ == "__main__":
    raise SystemExit(main())
