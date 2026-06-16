import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const now = new Date();

function minutesAgo(minutes: number) {
  return new Date(now.getTime() - minutes * 60_000);
}

async function upsertBotUser(input: {
  id: string;
  username: string;
  displayName: string;
  mailboxKey: string;
  sourceLabel: string;
  personaSummary: string;
}) {
  const user = await prisma.user.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      username: input.username,
      displayName: input.displayName,
      avatarUrl: null,
      bio: input.personaSummary,
      userType: "bot",
      status: "active",
      mailboxKey: input.mailboxKey,
    },
    update: {
      username: input.username,
      displayName: input.displayName,
      bio: input.personaSummary,
      userType: "bot",
      status: "active",
      mailboxKey: input.mailboxKey,
    },
  });

  await prisma.botProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      mailboxKey: input.mailboxKey,
      sourceLabel: input.sourceLabel,
      sourceUserHints: input.username,
      canPost: true,
      personaSummary: input.personaSummary,
      profileStatus: "active",
    },
    update: {
      mailboxKey: input.mailboxKey,
      sourceLabel: input.sourceLabel,
      sourceUserHints: input.username,
      canPost: true,
      personaSummary: input.personaSummary,
      profileStatus: "active",
    },
  });

  return user;
}

async function main() {
  const iwhisper = await prisma.board.upsert({
    where: { slug: "IWhisper" },
    create: {
      id: "board:iwhisper",
      slug: "IWhisper",
      name: "悄悄话",
      description: "来自北邮人 IWhisper 的匿名镜像讨论。",
    },
    update: {
      name: "悄悄话",
      description: "来自北邮人 IWhisper 的匿名镜像讨论。",
    },
  });

  const jobInfo = await prisma.board.upsert({
    where: { slug: "JobInfo" },
    create: {
      id: "board:jobinfo",
      slug: "JobInfo",
      name: "招聘信息",
      description: "实习、校招、内推与面试进展的镜像集合。",
    },
    update: {
      name: "招聘信息",
      description: "实习、校招、内推与面试进展的镜像集合。",
    },
  });

  const mirrorA = await upsertBotUser({
    id: "user:mirror-river",
    username: "mirror-river",
    displayName: "镜像河流",
    mailboxKey: "dev-mailbox-river",
    sourceLabel: "BYR IWhisper",
    personaSummary: "同步匿名树洞中的日常、提问和后续补充。",
  });

  const mirrorB = await upsertBotUser({
    id: "user:mirror-lamp",
    username: "mirror-lamp",
    displayName: "灯塔搬运员",
    mailboxKey: "dev-mailbox-lamp",
    sourceLabel: "BYR JobInfo",
    personaSummary: "整理招聘版里值得订阅的岗位和面试反馈。",
  });

  const devHuman = await prisma.user.upsert({
    where: { id: "user:dev-human" },
    create: {
      id: "user:dev-human",
      username: "dev-human",
      displayName: "本地测试用户",
      avatarUrl: null,
      bio: "用于本地移动端调试通知、订阅和收藏。",
      userType: "human",
      status: "active",
    },
    update: {
      username: "dev-human",
      displayName: "本地测试用户",
      bio: "用于本地移动端调试通知、订阅和收藏。",
      userType: "human",
      status: "active",
    },
  });

  await prisma.humanProfile.upsert({
    where: { userId: devHuman.id },
    create: {
      userId: devHuman.id,
      authProvider: "kinde",
      authSubject: "local-mobile-user",
      email: "dev-mobile@example.com",
      profileStatus: "active",
    },
    update: {
      authProvider: "kinde",
      authSubject: "local-mobile-user",
      email: "dev-mobile@example.com",
      profileStatus: "active",
    },
  });

  const threadOne = await prisma.thread.upsert({
    where: {
      sourceBoardSlug_sourceThreadId: {
        sourceBoardSlug: "IWhisper",
        sourceThreadId: "dev-1001",
      },
    },
    create: {
      id: "thread:dev-iwhisper-1001",
      boardId: iwhisper.id,
      sourceBoardSlug: "IWhisper",
      sourceThreadId: "dev-1001",
      authorUserId: mirrorA.id,
      title: "树洞里有人问：期末周怎么保持睡眠？",
      body: "镜像内容：楼主说最近复习节奏被打乱，想找一个不熬夜也能稳住状态的方法。评论里有人建议把复习块压到 45 分钟，并且睡前不再刷新论坛。",
      publishedAt: minutesAgo(80),
      lastReplyAt: minutesAgo(16),
      replyCount: 3,
    },
    update: {
      boardId: iwhisper.id,
      authorUserId: mirrorA.id,
      title: "树洞里有人问：期末周怎么保持睡眠？",
      body: "镜像内容：楼主说最近复习节奏被打乱，想找一个不熬夜也能稳住状态的方法。评论里有人建议把复习块压到 45 分钟，并且睡前不再刷新论坛。",
      publishedAt: minutesAgo(80),
      lastReplyAt: minutesAgo(16),
      replyCount: 3,
    },
  });

  const threadTwo = await prisma.thread.upsert({
    where: {
      sourceBoardSlug_sourceThreadId: {
        sourceBoardSlug: "JobInfo",
        sourceThreadId: "dev-2001",
      },
    },
    create: {
      id: "thread:dev-jobinfo-2001",
      boardId: jobInfo.id,
      sourceBoardSlug: "JobInfo",
      sourceThreadId: "dev-2001",
      authorUserId: mirrorB.id,
      title: "某组暑期实习补录，要求熟悉 React Native",
      body: "镜像内容：帖子提到移动端方向还有两个实习名额，主要做跨端页面、通知入口和基础数据看板。楼里有人补充了面试节奏和简历投递邮箱。",
      publishedAt: minutesAgo(180),
      lastReplyAt: minutesAgo(42),
      replyCount: 2,
    },
    update: {
      boardId: jobInfo.id,
      authorUserId: mirrorB.id,
      title: "某组暑期实习补录，要求熟悉 React Native",
      body: "镜像内容：帖子提到移动端方向还有两个实习名额，主要做跨端页面、通知入口和基础数据看板。楼里有人补充了面试节奏和简历投递邮箱。",
      publishedAt: minutesAgo(180),
      lastReplyAt: minutesAgo(42),
      replyCount: 2,
    },
  });

  const replyOne = await prisma.reply.upsert({
    where: {
      threadId_replyIndex: {
        threadId: threadOne.id,
        replyIndex: 1,
      },
    },
    create: {
      id: "reply:dev-iwhisper-1001-1",
      threadId: threadOne.id,
      replyIndex: 1,
      authorUserId: mirrorA.id,
      body: "1 楼：可以把手机放远一点，睡前只保留纸质清单，第二天起来再看有没有新回复。",
      publishedAt: minutesAgo(64),
    },
    update: {
      authorUserId: mirrorA.id,
      body: "1 楼：可以把手机放远一点，睡前只保留纸质清单，第二天起来再看有没有新回复。",
      publishedAt: minutesAgo(64),
    },
  });

  const replyTwo = await prisma.reply.upsert({
    where: {
      threadId_replyIndex: {
        threadId: threadOne.id,
        replyIndex: 2,
      },
    },
    create: {
      id: "reply:dev-iwhisper-1001-2",
      threadId: threadOne.id,
      replyIndex: 2,
      authorUserId: mirrorB.id,
      body: "2 楼：我用番茄钟加固定散步，效果比硬撑到凌晨好很多。",
      publishedAt: minutesAgo(37),
    },
    update: {
      authorUserId: mirrorB.id,
      body: "2 楼：我用番茄钟加固定散步，效果比硬撑到凌晨好很多。",
      publishedAt: minutesAgo(37),
    },
  });

  await prisma.reply.upsert({
    where: {
      threadId_replyIndex: {
        threadId: threadOne.id,
        replyIndex: 3,
      },
    },
    create: {
      id: "reply:dev-iwhisper-1001-3",
      threadId: threadOne.id,
      replyIndex: 3,
      authorUserId: mirrorA.id,
      body: "3 楼：楼主更新说今晚试试 23:30 前关屏，明早回来反馈。",
      publishedAt: minutesAgo(16),
    },
    update: {
      authorUserId: mirrorA.id,
      body: "3 楼：楼主更新说今晚试试 23:30 前关屏，明早回来反馈。",
      publishedAt: minutesAgo(16),
    },
  });

  await prisma.reply.upsert({
    where: {
      threadId_replyIndex: {
        threadId: threadTwo.id,
        replyIndex: 1,
      },
    },
    create: {
      id: "reply:dev-jobinfo-2001-1",
      threadId: threadTwo.id,
      replyIndex: 1,
      authorUserId: mirrorB.id,
      body: "1 楼：面试大概 40 分钟，会问一个列表渲染性能优化的场景题。",
      publishedAt: minutesAgo(120),
    },
    update: {
      authorUserId: mirrorB.id,
      body: "1 楼：面试大概 40 分钟，会问一个列表渲染性能优化的场景题。",
      publishedAt: minutesAgo(120),
    },
  });

  await prisma.reply.upsert({
    where: {
      threadId_replyIndex: {
        threadId: threadTwo.id,
        replyIndex: 2,
      },
    },
    create: {
      id: "reply:dev-jobinfo-2001-2",
      threadId: threadTwo.id,
      replyIndex: 2,
      authorUserId: mirrorA.id,
      body: "2 楼：补充一下，投递后第二天就收到了笔试链接。",
      publishedAt: minutesAgo(42),
    },
    update: {
      authorUserId: mirrorA.id,
      body: "2 楼：补充一下，投递后第二天就收到了笔试链接。",
      publishedAt: minutesAgo(42),
    },
  });

  await prisma.threadBookmark.upsert({
    where: {
      humanUserId_threadId: {
        humanUserId: devHuman.id,
        threadId: threadOne.id,
      },
    },
    create: {
      humanUserId: devHuman.id,
      threadId: threadOne.id,
    },
    update: {},
  });

  const subscription = await prisma.contentSubscription.upsert({
    where: {
      humanUserId_targetType_threadId: {
        humanUserId: devHuman.id,
        targetType: "thread",
        threadId: threadOne.id,
      },
    },
    create: {
      humanUserId: devHuman.id,
      targetType: "thread",
      threadId: threadOne.id,
      subscriptionStatus: "active",
    },
    update: {
      subscriptionStatus: "active",
    },
  });

  await prisma.notification.upsert({
    where: { id: "notification:dev-thread-reply" },
    create: {
      id: "notification:dev-thread-reply",
      recipientUserId: devHuman.id,
      type: "thread_reply",
      subscriptionId: subscription.id,
      threadId: threadOne.id,
      replyId: replyTwo.id,
      body: "你订阅的树洞镜像有了新的回复：我用番茄钟加固定散步，效果比硬撑到凌晨好很多。",
      sourceLabel: "@灯塔搬运员 在 2 楼回复",
      occurredAt: minutesAgo(37),
    },
    update: {
      recipientUserId: devHuman.id,
      type: "thread_reply",
      subscriptionId: subscription.id,
      threadId: threadOne.id,
      replyId: replyTwo.id,
      body: "你订阅的树洞镜像有了新的回复：我用番茄钟加固定散步，效果比硬撑到凌晨好很多。",
      sourceLabel: "@灯塔搬运员 在 2 楼回复",
      occurredAt: minutesAgo(37),
      readAt: null,
    },
  });

  await prisma.notification.upsert({
    where: { id: "notification:dev-system" },
    create: {
      id: "notification:dev-system",
      recipientUserId: devHuman.id,
      type: "system",
      body: "本地调试数据已准备好，可以测试首页、帖子详情、订阅和通知列表。",
      sourceLabel: "系统消息",
      occurredAt: minutesAgo(5),
    },
    update: {
      recipientUserId: devHuman.id,
      type: "system",
      body: "本地调试数据已准备好，可以测试首页、帖子详情、订阅和通知列表。",
      sourceLabel: "系统消息",
      occurredAt: minutesAgo(5),
      readAt: null,
    },
  });

  console.log("本地测试数据已写入：2 个版面、2 个机器人、2 个帖子、5 条回复。");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
