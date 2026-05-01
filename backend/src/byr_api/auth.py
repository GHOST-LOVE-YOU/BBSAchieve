from __future__ import annotations

import os
from pathlib import Path

from dotenv import dotenv_values
from fastapi import Header, HTTPException

DEFAULT_ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_ENV_PATH = DEFAULT_ROOT_DIR / ".env"
INVALID_TOKEN_DETAIL = "Invalid sync API token"


def require_sync_token(x_sync_token: str | None = Header(default=None)) -> str:
    token = _load_sync_token()
    if not x_sync_token or x_sync_token != token:
        raise HTTPException(status_code=401, detail=INVALID_TOKEN_DETAIL)
    return x_sync_token


def _load_sync_token(*, root_dir: Path | None = None) -> str | None:
    token = os.getenv("BYR_SYNC_API_TOKEN")
    if token:
        return token

    env_path = root_dir / ".env" if root_dir is not None else DEFAULT_ENV_PATH
    env_values = dotenv_values(env_path)
    value = env_values.get("BYR_SYNC_API_TOKEN")
    return value if value else None
