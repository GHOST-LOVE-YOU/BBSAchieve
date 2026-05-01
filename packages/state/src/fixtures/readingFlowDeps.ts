import {
  InMemoryBoardRepository,
  InMemoryReplyRepository,
  InMemoryThreadRepository,
  InMemoryUserRepository,
  createForumFixture,
} from "@bbs/test-utils";

export function createReadingFlowDeps() {
  const forumFixture = createForumFixture();

  return {
    boards: new InMemoryBoardRepository(forumFixture.boards),
    replies: new InMemoryReplyRepository(forumFixture.replies),
    threads: new InMemoryThreadRepository(forumFixture.threads),
    users: new InMemoryUserRepository(forumFixture.users),
  };
}
