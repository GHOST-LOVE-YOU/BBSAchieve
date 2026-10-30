import type { PrismaClient } from "@prisma/client";
import { getMirrorBoard, mirrorBoards } from "../config";
export async function initializeBoards(db: PrismaClient) {
  for (const board of mirrorBoards)
    await db.mirrorBoardState.upsert({
      where: { boardName: board.name },
      create: { boardName: board.name },
      update: {},
    });
}
export async function queueBoard(
  db: PrismaClient,
  boardName: string,
  trigger: "manual" | "scheduled",
) {
  const board = getMirrorBoard(boardName);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"mirror-queue:" + boardName}))`;
    const state = await tx.mirrorBoardState.upsert({
      where: { boardName },
      create: { boardName },
      update: {},
    });
    const active = await tx.mirrorRun.findFirst({
      where: { boardName, status: { in: ["queued", "collecting"] } },
    });
    if (active) return active;
    if (
      trigger === "scheduled" &&
      (state.paused || state.nextRunAt > new Date())
    )
      return null;
    // 失败后续接同一次扫描，不把新窗口覆盖尚未完成的进度。
    const failed = await tx.mirrorRun.findFirst({
      where: { boardName, status: "failed" },
      orderBy: { startedAt: "desc" },
    });
    if (failed)
      return tx.mirrorRun.update({
        where: { id: failed.id },
        data: { status: "queued", errorMessage: null, finishedAt: null },
      });
    const end = new Date();
    const start = new Date(
      Math.min(
        end.getTime() - board.windowMinutes * 60_000,
        state.lastCompletedAt
          ? state.lastCompletedAt.getTime() - 5 * 60_000
          : end.getTime(),
      ),
    );
    return tx.mirrorRun.create({
      data: { boardName, trigger, windowStart: start, windowEnd: end },
    });
  });
}
