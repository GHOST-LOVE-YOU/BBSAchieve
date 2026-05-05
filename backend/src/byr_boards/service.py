from __future__ import annotations

from byr_auth import AuthError, ByrAuthClient
from byr_auth.encoding import decode_response_text

from .models import BoardPageResult
from .parser import parse_board_page


class BoardService:
    def __init__(self, auth_client: ByrAuthClient | None = None) -> None:
        self.auth_client = auth_client or ByrAuthClient()

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

    @staticmethod
    def _decode_text(response) -> str:
        return decode_response_text(response)
