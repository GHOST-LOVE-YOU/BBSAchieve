import {
  InMemoryBoardRepository,
  InMemoryReplyRepository,
  InMemoryThreadRepository,
  InMemoryUserRepository,
  createForumFixture,
} from "@bbs/test-utils";

const forumFixture = createForumFixture();

export const readingFlowDeps = {
  boards: new InMemoryBoardRepository(forumFixture.boards),
  replies: new InMemoryReplyRepository(forumFixture.replies),
  threads: new InMemoryThreadRepository(forumFixture.threads),
  users: new InMemoryUserRepository(forumFixture.users),
};
