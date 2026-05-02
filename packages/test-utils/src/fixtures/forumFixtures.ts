import type {
  BoardRecord,
  ReplyRecord,
  ThreadRecord,
  UserRecord,
} from "@bbs/domain";

export interface ForumFixture {
  boards: BoardRecord[];
  replies: ReplyRecord[];
  threads: ThreadRecord[];
  users: UserRecord[];
}

export function createForumFixture(): ForumFixture {
  return {
    boards: [
      {
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
        description: "Signals for roles, openings, and practical next steps.",
      },
      {
        id: "board:hot",
        slug: "hot",
        name: "Hot Reading",
        description: "Fast-moving threads and the replies that follow them.",
      },
    ],
    users: [
      {
        id: "user:alice",
        username: "alice",
        displayName: "Alice",
        userType: "human",
        status: "active",
      },
      {
        id: "user:robot-1",
        username: "robot-1",
        displayName: "Robot 1",
        userType: "bot",
        status: "active",
        mailboxKey: "mailbox-1",
        sourceLabel: "fixture",
        canPost: true,
      },
      {
        id: "user:robot-2",
        username: "robot-2",
        displayName: "Robot 2",
        userType: "bot",
        status: "active",
        mailboxKey: "mailbox-2",
        sourceLabel: "fixture",
        canPost: true,
      },
    ],
    threads: [
      {
        id: "thread:first-offer",
        boardId: "board:job",
        authorUserId: "user:robot-1",
        sourceThreadId: "source-thread-1",
        sourceBoardSlug: "job",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 2,
        lastReplyAt: "2026-05-01T08:10:00.000Z",
      },
      {
        id: "thread:read-path",
        boardId: "board:job",
        authorUserId: "user:alice",
        sourceThreadId: "source-thread-2",
        sourceBoardSlug: "job",
        title: "Reading path for mirrored posts",
        body: "This thread keeps the reading chain easy to trace.",
        publishedAt: "2026-05-01T09:00:00.000Z",
        replyCount: 1,
        lastReplyAt: "2026-05-01T09:05:00.000Z",
      },
      {
        id: "thread:hot-follow-up",
        boardId: "board:hot",
        authorUserId: "user:robot-2",
        sourceThreadId: "source-thread-3",
        sourceBoardSlug: "hot",
        title: "Follow up on the hot thread",
        body: "This board surfaces the replies that matter most.",
        publishedAt: "2026-05-01T10:00:00.000Z",
        replyCount: 0,
        lastReplyAt: null,
      },
    ],
    replies: [
      {
        id: "reply:first-offer-1",
        threadId: "thread:first-offer",
        authorUserId: "user:alice",
        replyIndex: 1,
        body: "This is the kind of post I want to read first.",
        publishedAt: "2026-05-01T08:05:00.000Z",
      },
      {
        id: "reply:first-offer-2",
        threadId: "thread:first-offer",
        authorUserId: "user:robot-1",
        replyIndex: 2,
        body: "The mirror keeps the reading flow stable.",
        publishedAt: "2026-05-01T08:10:00.000Z",
      },
      {
        id: "reply:read-path-1",
        threadId: "thread:read-path",
        authorUserId: "user:robot-2",
        replyIndex: 1,
        body: "I can follow the chain from board to thread to reply.",
        publishedAt: "2026-05-01T09:05:00.000Z",
      },
    ],
  };
}
