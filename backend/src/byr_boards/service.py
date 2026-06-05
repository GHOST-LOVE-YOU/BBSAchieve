from __future__ import annotations

from collections.abc import Callable

import httpx

from byr_auth import AuthError, ByrAuthClient
from byr_auth.encoding import decode_response_text

from .models import BoardPageResult
from .parser import parse_board_page


class BoardService:
    def __init__(
        self,
        auth_client: ByrAuthClient | None = None,
        *,
        sleep: Callable[[float], None] | None = None,
        request_retry_count: int = 1,
        request_retry_delay_seconds: float = 1.0,
    ) -> None:
        self.auth_client = auth_client or ByrAuthClient()
        self.sleep = sleep or (lambda _seconds: None)
        self.request_retry_count = max(request_retry_count, 0)
        self.request_retry_delay_seconds = max(request_retry_delay_seconds, 0.0)

    def fetch_page(
        self,
        *,
        board_name: str = "IWhisper",
        page: int = 1,
        force_relogin: bool = False,
        include_sticky_threads: bool = False,
    ) -> BoardPageResult:
        if page < 1:
            raise AuthError("Page must be greater than or equal to 1")

        last_timeout: httpx.TimeoutException | None = None
        for attempt in range(self.request_retry_count + 1):
            try:
                with self.auth_client.open_authenticated_client(
                    force_relogin=force_relogin
                ) as auth_context:
                    response = auth_context.client.get(
                        f"/board/{board_name}",
                        params={"p": page, "_uid": auth_context.session.user_id},
                    )
                    response.raise_for_status()
                    requested_url = str(response.request.url)
                    html = self._decode_text(response)
                    return parse_board_page(
                        html=html,
                        board_name=board_name,
                        page=page,
                        user_id=auth_context.session.user_id,
                        reused_cookies=auth_context.reused_cookies,
                        requested_url=requested_url,
                        include_sticky_threads=include_sticky_threads,
                    )
            except httpx.TimeoutException as exc:
                last_timeout = exc
                if attempt >= self.request_retry_count:
                    raise
                self.sleep(self.request_retry_delay_seconds)

        raise last_timeout or AuthError("Board request failed")

    @staticmethod
    def _decode_text(response) -> str:
        return decode_response_text(response)
