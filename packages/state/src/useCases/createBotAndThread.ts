import type { ThreadRepository, UserRepository } from "@bbs/domain";

export async function createBotAndThread(
  input: {
    username: string;
    displayName: string;
    mailboxKey: string;
    boardId: string;
    title: string;
    body: string;
  },
  deps: {
    users: UserRepository;
    threads: ThreadRepository;
  },
) {
  let author = await deps.users.findByUsername(input.username);

  if (!author) {
    author = await deps.users.createBot({
      id: `bot:${input.username}`,
      username: input.username,
      displayName: input.displayName,
      userType: "bot",
      status: "active",
      mailboxKey: input.mailboxKey,
    });
  }

  const thread = await deps.threads.create({
    id: `thread:${input.title}`,
    boardId: input.boardId,
    authorUserId: author.id,
    title: input.title,
    body: input.body,
  });

  return { author, thread };
}
