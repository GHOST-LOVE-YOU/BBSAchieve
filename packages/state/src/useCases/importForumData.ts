import type { ThreadRepository, UserRepository } from "@bbs/domain";

export async function importForumData(
  input: {
    mode: "strict" | "best-effort";
    users: Array<{ username: string; displayName: string; mailboxKey: string }>;
    threads: Array<{ boardId: string; authorUsername: string; title: string; body: string }>;
    replies: Array<{ threadTitle: string; authorUsername: string; body: string }>;
  },
  deps: {
    users: UserRepository;
    threads: ThreadRepository;
  },
) {
  const failedItems: Array<{ type: string; reason: string }> = [];
  let importedThreads = 0;

  for (const user of input.users) {
    if (!(await deps.users.findByUsername(user.username))) {
      await deps.users.createBot({
        id: `bot:${user.username}`,
        username: user.username,
        displayName: user.displayName,
        userType: "bot",
        status: "active",
        mailboxKey: user.mailboxKey,
      });
    }
  }

  for (const thread of input.threads) {
    const author = await deps.users.findByUsername(thread.authorUsername);
    if (!author) {
      failedItems.push({ type: "thread", reason: "author missing" });
      continue;
    }

    await deps.threads.create({
      id: `thread:${thread.title}`,
      boardId: thread.boardId,
      authorUserId: author.id,
      title: thread.title,
      body: thread.body,
      publishedAt: new Date().toISOString(),
    });
    importedThreads += 1;
  }

  for (const reply of input.replies) {
    failedItems.push({ type: "reply", reason: `thread ${reply.threadTitle} not found` });
  }

  return {
    importedThreads,
    failedItems,
  };
}
