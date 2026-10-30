import type { Prisma } from "@prisma/client";
import { getMirrorBoard } from "../config";
export async function initializeProgress(
  tx: Prisma.TransactionClient,
  boardName: string,
  sourceThreadId: string,
) {
  const where = { boardName_sourceThreadId: { boardName, sourceThreadId } };
  let state = await tx.mirrorThreadState.upsert({
    where,
    create: {
      boardName,
      sourceThreadId,
      fingerprint: "",
      checkedAt: new Date(0),
    },
    update: {},
  });
  if (state.progressInitialized) return state;
  const thread = await tx.thread.findUnique({
    where: {
      sourceBoardSlug_sourceThreadId: {
        sourceBoardSlug: getMirrorBoard(boardName).slug,
        sourceThreadId,
      },
    },
    select: { id: true },
  });
  let floor = -1;
  if (thread) {
    // 仅首次校准扫描历史楼层；不将最大楼层误当成连续完成位置。
    // 第一个不连续位置取行号前一位，而非该记录的楼层。
    const gap = await tx.$queryRaw<
      Array<{ floor: number }>
    >`SELECT COALESCE(MIN(rn) FILTER (WHERE "replyIndex" <> rn), MAX(rn)+1,1)::int - 1 AS floor FROM (SELECT "replyIndex", row_number() OVER (ORDER BY "replyIndex") AS rn FROM replies WHERE "threadId"=${thread.id} AND "replyIndex">0) r`;
    floor = gap[0].floor;
    const last = await tx.reply.findFirst({
      where: { threadId: thread.id },
      orderBy: { replyIndex: "desc" },
      select: { replyIndex: true },
    });
    if (last && last.replyIndex > floor)
      await tx.mirrorAnomaly.create({
        data: {
          boardName,
          sourceThreadId,
          stage: "initialization",
          message: `历史楼层存在缺口：连续完成到 ${floor}，最大楼层 ${last.replyIndex}；将从缺口补齐`,
        },
      });
  }
  state = await tx.mirrorThreadState.update({
    where,
    data: {
      publishedThroughFloor: floor,
      collectedThroughFloor: floor,
      progressInitialized: true,
    },
  });
  return state;
}
