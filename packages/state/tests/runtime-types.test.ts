import { describe, expect, it } from "vitest";

import type {
  ReplyRecord,
  ThreadRecord,
  UserRecord,
} from "@bbs/domain";
import { createForumFixture } from "@bbs/test-utils";

describe("runtime forum fixtures", () => {
  it("exposes source-backed thread and reply fields", () => {
    const fixture = createForumFixture();

    const thread: ThreadRecord = fixture.threads[0];
    const reply: ReplyRecord = fixture.replies[0];
    const user: UserRecord = fixture.users[1];

    expect(thread.sourceThreadId).toBe("source-thread-1");
    expect(thread.sourceBoardSlug).toBe("job");
    expect(thread.replyCount).toBe(2);
    expect(thread.lastReplyAt).toBe("2026-05-01T08:10:00.000Z");
    expect(reply.replyIndex).toBe(1);
    expect(user.mailboxKey).toBe("mailbox-1");
  });

  it("keeps bot user fields available on user records", () => {
    const fixture = createForumFixture();

    expect(fixture.users[1].mailboxKey).toBe("mailbox-1");
    expect(fixture.users[1].userType).toBe("bot");
  });
});
