import { loadEnvConfig } from "@next/env";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { FixtureSource } from "./fixture";
import { collectSlice } from "../collection/runner";
import { initializeBoards, queueBoard } from "../scheduling/control";
import { getMirrorBoard } from "../config";
import { publishAtomicAction } from "../publishing/service";
import { dispatchActions } from "../publishing/dispatcher";
import { acquireLease, releaseLease } from "../scheduling/lease";
import { SourceError } from "../source/types";
loadEnvConfig(process.cwd(), true);
async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(url.hostname),
    "集成测试仅允许本机数据库",
  );
  const schema = "mirror_test_" + randomUUID().replaceAll("-", "");
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const result = spawnSync(
      "pnpm",
      ["exec", "prisma", "db", "push", "--skip-generate"],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    await initializeBoards(db);
    const owner1 = randomUUID(),
      owner2 = randomUUID();
    const acquired = await Promise.all([
      acquireLease(db, owner1),
      acquireLease(db, owner2),
    ]);
    assert.equal(acquired.filter(Boolean).length, 1);
    await releaseLease(db, acquired[0] ? owner2 : owner1);
    assert.equal(await db.mirrorLease.count(), 1);
    await db.mirrorLease.updateMany({ data: { expiresAt: new Date(0) } });
    assert(await acquireLease(db, "replacement"));
    await releaseLease(db, "replacement");
    console.log("PASS PostgreSQL 租约互斥、过期接管、旧持有者不能释放新租约");
    const queued = await Promise.all([
      queueBoard(db, "IWhisper", "manual"),
      queueBoard(db, "IWhisper", "manual"),
    ]);
    assert.equal(queued[0]!.id, queued[1]!.id);
    let run = queued[0]!;
    const source = new FixtureSource();
    await collectSlice(db, source, getMirrorBoard("IWhisper"), run, 2);
    assert.equal(await db.mirrorAction.count(), 10);
    assert.equal(await db.thread.count(), 0);
    run = await db.mirrorRun.findUniqueOrThrow({ where: { id: run.id } });
    assert.equal(run.nextThreadPage, 2);
    await collectSlice(
      db,
      new FixtureSource(),
      getMirrorBoard("IWhisper"),
      run,
      8,
    );
    run = await db.mirrorRun.findUniqueOrThrow({ where: { id: run.id } });
    assert.equal(run.status, "collected");
    assert.equal(await db.mirrorAction.count(), 14);
    console.log("PASS 跨页采集、进程重建后恢复、采集阶段不写帖子/回复");
    const tasks = await db.mirrorAction.findMany({
      orderBy: { sourcePostId: "asc" },
    });
    const original = tasks.find((t) => t.kind === "thread")!;
    const reply = tasks.find((t) => t.kind === "reply")!;
    const created = await publishAtomicAction(db, original.id);
    assert(created.id);
    await db.user.create({
      data: {
        id: "subscriber",
        username: "subscriber",
        displayName: "订阅者",
        userType: "human",
        status: "active",
      },
    });
    await db.contentSubscription.create({
      data: {
        humanUserId: "subscriber",
        targetType: "thread",
        threadId: created.id,
        createdAt: new Date(0),
      },
    });
    const outcomes = await Promise.all([
      publishAtomicAction(db, reply.id),
      publishAtomicAction(db, reply.id),
    ]);
    assert.equal(outcomes.filter((o) => o.duplicate).length, 1);
    assert.equal(await db.reply.count(), 1);
    assert.equal(await db.notification.count(), 1);
    console.log("PASS 并发重复请求只发一条回复、一条通知");
    await db.user.create({
      data: {
        id: "quote-subscriber",
        username: "quote-subscriber",
        displayName: "引用订阅者",
        userType: "human",
        status: "active",
      },
    });
    await db.contentSubscription.create({
      data: {
        humanUserId: "quote-subscriber",
        targetType: "reply",
        replyId: outcomes[0].id,
        createdAt: new Date(0),
      },
    });
    const quotedTask = tasks.filter((t) => t.kind === "reply")[1];
    await db.mirrorAction.update({
      where: { id: quotedTask.id },
      data: {
        payload: {
          ...(quotedTask.payload as Prisma.JsonObject),
          quotedSourcePostIds: [reply.sourcePostId],
        },
      },
    });
    await publishAtomicAction(db, quotedTask.id);
    assert.equal(
      await db.notification.count({
        where: { recipientUserId: "quote-subscriber", type: "reply_quote" },
      }),
      1,
    );
    console.log("PASS 帖子订阅和明确引用的回复订阅分别触发通知");
    const next = tasks.filter((t) => t.kind === "reply")[2];
    await db.mirrorAction.updateMany({
      where: { status: "pending", id: { not: next.id } },
      data: { nextAttemptAt: new Date(Date.now() + 3600000) },
    });
    const transport: typeof fetch = async (_url, options) => {
      const id = JSON.parse(String(options?.body)).actionId;
      await publishAtomicAction(db, id);
      throw new Error("response lost");
    };
    await dispatchActions(db, async () => {}, transport, 1);
    const receipt = await db.mirrorAction.findUniqueOrThrow({
      where: { id: next.id },
    });
    assert.equal(receipt.status, "published");
    assert.equal(receipt.attempts, 0);
    await publishAtomicAction(db, next.id);
    assert.equal(await db.reply.count(), 3);
    console.log("PASS API 已提交但响应丢失时，不倒退回执、不重复发布");
    const before = await db.mirrorAction.count();
    const rerun = await queueBoard(db, "IWhisper", "manual");
    await db.mirrorThreadState.deleteMany();
    await collectSlice(
      db,
      new FixtureSource(),
      getMirrorBoard("IWhisper"),
      rerun!,
      8,
    );
    assert.equal(await db.mirrorAction.count(), before);
    console.log("PASS 重复采集按源站 ID 去重");
    const missing = await queueBoard(db, "JobInfo", "manual");
    const gone = new FixtureSource();
    gone.article = async () => {
      throw new SourceError("missing", "源站帖子已不存在");
    };
    await collectSlice(db, gone, getMirrorBoard("JobInfo"), missing!, 8);
    assert.equal(
      (await db.mirrorRun.findUniqueOrThrow({ where: { id: missing!.id } }))
        .skippedThreads,
      1,
    );
    console.log("PASS 已删除的源站帖子可跳过并记录");
    const gapTask = await db.mirrorAction.create({
      data: {
        runId: run.id,
        boardName: "IWhisper",
        sourceThreadId: original.sourceThreadId,
        sourcePostId: "999999999",
        kind: "reply",
        summary: "gap",
        payload: {
          ...(reply.payload as Prisma.JsonObject),
          sourcePostId: "999999999",
          sourceFloor: 50,
        },
      },
    });
    await assert.rejects(publishAtomicAction(db, gapTask.id), /楼层不连续/);
    assert.equal(
      await db.mirrorAnomaly.count({ where: { actionId: gapTask.id } }),
      1,
    );
    assert.equal(await db.reply.count(), 3);
    const duplicate = await db.mirrorAction.create({
      data: {
        runId: run.id,
        boardName: "IWhisper",
        sourceThreadId: original.sourceThreadId,
        sourcePostId: "999999998",
        kind: "reply",
        summary: "duplicate",
        payload: {
          ...(reply.payload as Prisma.JsonObject),
          sourcePostId: "999999998",
          body: "不同文本但相同楼层",
        },
      },
    });
    assert.equal((await publishAtomicAction(db, duplicate.id)).duplicate, true);
    assert.equal(
      await db.mirrorAnomaly.count({ where: { actionId: duplicate.id } }),
      0,
    );
    console.log("PASS 跳楼拒绝并持久记录，重复楼层静默跳过");
    await db.mirrorThreadState.update({
      where: {
        boardName_sourceThreadId: {
          boardName: "IWhisper",
          sourceThreadId: original.sourceThreadId,
        },
      },
      data: { collectedThroughFloor: 11, checkedAt: new Date(0) },
    });
    const incremental = await queueBoard(db, "IWhisper", "manual");
    const incrementalSource = new FixtureSource();
    const visited: number[] = [];
    const read = incrementalSource.article.bind(incrementalSource);
    incrementalSource.article = async (b, id, page) => {
      visited.push(page);
      return read(b, id, page);
    };
    await collectSlice(
      db,
      incrementalSource,
      getMirrorBoard("IWhisper"),
      incremental!,
      8,
    );
    assert.deepEqual(visited, [2]);
    assert.equal(
      (
        await db.mirrorThreadState.findUniqueOrThrow({
          where: {
            boardName_sourceThreadId: {
              boardName: "IWhisper",
              sourceThreadId: original.sourceThreadId,
            },
          },
        })
      ).collectedThroughFloor,
      13,
    );
    console.log("PASS 已采集至 11 楼直接请求第 2 页，不读第一页");
  } finally {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
