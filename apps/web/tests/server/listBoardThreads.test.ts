import { describe, expect, it, vi } from "vitest";

import {
  decodeThreadCursor,
  encodeThreadCursor,
  listBoardThreads,
} from "@/src/server/reading/listBoardThreads";

describe("thread cursor helpers", () => {
  it("round-trips a cursor token", () => {
    const cursor = {
      lastReplyAt: "2026-05-01T09:05:00.000Z",
      threadId: "thread:read-path",
    };

    expect(decodeThreadCursor(encodeThreadCursor(cursor))).toEqual(cursor);
  });

  it("returns null for invalid cursor tokens", () => {
    expect(decodeThreadCursor("")).toBeNull();
    expect(decodeThreadCursor("not-a-cursor")).toBeNull();
    expect(decodeThreadCursor(Buffer.from("{\"bad\":true}").toString("base64url"))).toBeNull();
  });
});

describe("listBoardThreads", () => {
  it("sorts by lastReplyAt desc and thread id as a stable tiebreaker", async () => {
    const fetchBoardThreads = vi.fn(async (boardSlug: string) => {
      expect(boardSlug).toBe("job");

      return [
        {
          id: "thread:later",
          boardSlug: "job",
          lastReplyAt: "2026-05-01T09:05:00.000Z",
        },
        {
          id: "thread:tie-b",
          boardSlug: "job",
          lastReplyAt: "2026-05-01T08:10:00.000Z",
        },
        {
          id: "thread:tie-a",
          boardSlug: "job",
          lastReplyAt: "2026-05-01T08:10:00.000Z",
        },
        {
          id: "thread:none",
          boardSlug: "job",
          lastReplyAt: null,
        },
        {
          id: "thread:other-board",
          boardSlug: "hot",
          lastReplyAt: "2026-05-01T11:00:00.000Z",
        },
      ];
    });

    const firstPage = await listBoardThreads(
      { boardSlug: "job", limit: 2 },
      { fetchBoardThreads },
    );

    expect(firstPage.threads.map((thread) => thread.id)).toEqual([
      "thread:later",
      "thread:tie-b",
    ]);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = await listBoardThreads(
      {
        boardSlug: "job",
        limit: 2,
        cursor: firstPage.nextCursor,
      },
      { fetchBoardThreads },
    );

    expect(secondPage.threads.map((thread) => thread.id)).toEqual([
      "thread:tie-a",
      "thread:none",
    ]);
  });
});
