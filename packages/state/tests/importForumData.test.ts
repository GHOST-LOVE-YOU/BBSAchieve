import { describe, expect, it } from "vitest";

import {
  InMemoryThreadRepository,
  InMemoryUserRepository,
} from "@bbs/test-utils";
import { importForumData } from "../src";

describe("importForumData", () => {
  it("imports users and threads and records failed items", async () => {
    const result = await importForumData(
      {
        mode: "best-effort",
        users: [
          {
            username: "robot-c",
            displayName: "机器人 C",
            mailboxKey: "mailbox-c",
          },
        ],
        threads: [
          {
            boardId: "board-1",
            authorUsername: "robot-c",
            title: "导入帖",
            body: "正文",
          },
        ],
        replies: [
          {
            threadTitle: "missing-thread",
            authorUsername: "robot-c",
            body: "失败回复",
          },
        ],
      },
      {
        users: new InMemoryUserRepository(),
        threads: new InMemoryThreadRepository(),
      },
    );

    expect(result.importedThreads).toBe(1);
    expect(result.failedItems).toHaveLength(1);
  });

  it("does not count threads whose author is missing", async () => {
    const result = await importForumData(
      {
        mode: "best-effort",
        users: [],
        threads: [
          {
            boardId: "board-1",
            authorUsername: "missing-user",
            title: "失败帖",
            body: "正文",
          },
        ],
        replies: [],
      },
      {
        users: new InMemoryUserRepository(),
        threads: new InMemoryThreadRepository(),
      },
    );

    expect(result.failedItems).toEqual([
      { type: "thread", reason: "author missing" },
    ]);
    expect(result.importedThreads).toBe(0);
  });
});
