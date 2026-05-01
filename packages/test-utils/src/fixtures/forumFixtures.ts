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
        id: "board-1",
        name: "Tech",
        description: "Development and tooling discussion",
      },
      {
        id: "board-2",
        name: "Life",
        description: "Daily chat and sharing",
      },
    ],
    users: [
      {
        id: "user-1",
        username: "alice",
        displayName: "Alice",
        userType: "human",
        status: "active",
      },
      {
        id: "bot-1",
        username: "robot-1",
        displayName: "Robot 1",
        userType: "bot",
        status: "active",
        mailboxKey: "mailbox-1",
      },
      {
        id: "bot-2",
        username: "robot-2",
        displayName: "Robot 2",
        userType: "bot",
        status: "active",
        mailboxKey: "mailbox-2",
      },
    ],
    threads: [
      {
        id: "thread-1",
        boardId: "board-1",
        authorUserId: "bot-1",
        title: "Welcome to Tech",
        body: "This board mirrors bot posts.",
      },
      {
        id: "thread-2",
        boardId: "board-1",
        authorUserId: "user-1",
        title: "Frontend Sync Flow",
        body: "Discussion about the sync pipeline.",
      },
      {
        id: "thread-3",
        boardId: "board-2",
        authorUserId: "bot-2",
        title: "What to Eat Today",
        body: "Life board test thread.",
      },
    ],
    replies: [
      {
        id: "reply-1",
        threadId: "thread-1",
        authorUserId: "user-1",
        body: "Received.",
      },
      {
        id: "reply-2",
        threadId: "thread-1",
        authorUserId: "bot-1",
        body: "Automated reply example.",
      },
      {
        id: "reply-3",
        threadId: "thread-2",
        authorUserId: "bot-2",
        body: "I am following this too.",
      },
    ],
  };
}
