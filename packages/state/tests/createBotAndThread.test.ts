import { describe, expect, it } from "vitest";

import {
  InMemoryThreadRepository,
  InMemoryUserRepository,
} from "@bbs/test-utils";
import { createBotAndThread } from "../src";

describe("createBotAndThread", () => {
  it("creates missing bot before creating thread", async () => {
    const users = new InMemoryUserRepository();
    const threads = new InMemoryThreadRepository();

    const result = await createBotAndThread(
      {
        username: "robot-100",
        displayName: "机器人 100",
        mailboxKey: "mailbox-100",
        boardId: "board-1",
        title: "新帖",
        body: "正文",
      },
      { users, threads },
    );

    expect(result.thread.title).toBe("新帖");
    expect(await users.findByUsername("robot-100")).not.toBeNull();
  });
});
