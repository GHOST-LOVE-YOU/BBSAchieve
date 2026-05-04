export type BoardFeedCursor = {
  lastReplyAt: string | null;
  id: string;
};

export function encodeBoardFeedCursor(input: BoardFeedCursor) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export function decodeBoardFeedCursor(cursor: string): BoardFeedCursor {
  const parsed = JSON.parse(
    Buffer.from(cursor, "base64url").toString("utf8"),
  ) as BoardFeedCursor;

  if (
    typeof parsed.id !== "string" ||
    !("lastReplyAt" in parsed) ||
    (parsed.lastReplyAt !== null && typeof parsed.lastReplyAt !== "string")
  ) {
    throw new Error("Invalid board cursor");
  }

  return parsed;
}
