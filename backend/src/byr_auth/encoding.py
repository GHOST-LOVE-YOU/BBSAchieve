from __future__ import annotations

from typing import Any


def decode_response_text(response: Any) -> str:
    attempted_encodings: list[str] = []
    for encoding in [response.encoding, "utf-8", "gbk", "gb18030"]:
        if not encoding or encoding in attempted_encodings:
            continue
        attempted_encodings.append(encoding)
        try:
            return response.content.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return response.content.decode("utf-8", errors="replace")
