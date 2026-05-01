import { describe, expect, it } from "vitest";

import {
  createBotUserInputSchema,
  createThreadInputSchema,
  DomainError,
} from "../src/index";

describe("domain schemas", () => {
  it("accepts bot user input", () => {
    const parsed = createBotUserInputSchema.parse({
      username: "robot-001",
      displayName: "机器人 001",
      mailboxKey: "mailbox-001",
    });

    expect(parsed.username).toBe("robot-001");
  });

  it("rejects empty thread title", () => {
    expect(() =>
      createThreadInputSchema.parse({
        boardId: "board-1",
        authorUserId: "user-1",
        title: "",
        body: "body",
      }),
    ).toThrow();
  });

  it("keeps stable domain error code", () => {
    expect(new DomainError("AUTHOR_NOT_FOUND", "missing").code).toBe(
      "AUTHOR_NOT_FOUND",
    );
  });
});
