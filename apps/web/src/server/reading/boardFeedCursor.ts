export type BoardFeedCursor = {
  lastReplyAt: string | null;
  id: string;
};

export function encodeBoardFeedCursor(input: BoardFeedCursor) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export function decodeBoardFeedCursor(cursor: string): BoardFeedCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;

    if (parsed == null || typeof parsed !== "object") {
      throw new Error("Invalid board cursor");
    }

    const { id, lastReplyAt } = parsed as Record<string, unknown>;
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("Invalid board cursor");
    }

    if (lastReplyAt !== null && typeof lastReplyAt !== "string") {
      throw new Error("Invalid board cursor");
    }

    if (typeof lastReplyAt === "string" && Number.isNaN(new Date(lastReplyAt).getTime())) {
      throw new Error("Invalid board cursor");
    }

    return {
      id,
      lastReplyAt: lastReplyAt ?? null,
    };
  } catch {
    throw new Error("Invalid board cursor");
  }
}
