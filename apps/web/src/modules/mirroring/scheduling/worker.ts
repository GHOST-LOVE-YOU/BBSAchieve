import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/src/server/db/client";
import {
  getMirrorBoard,
  mirrorBoards,
  mirrorEnabled,
  TICK_MS,
} from "../config";
import { collectSlice } from "../collection/runner";
import { getSource } from "../source";
import type { SourceClient } from "../source/types";
import { dispatchActions } from "../publishing/dispatcher";
import { acquireLease, releaseLease, renewLease } from "./lease";
import { initializeBoards, queueBoard } from "./control";
export async function runMirrorTick(
  db: PrismaClient = prisma,
  source: SourceClient = getSource(),
) {
  const owner = randomUUID();
  if (!(await acquireLease(db, owner))) return { skipped: true };
  let lost = false;
  const ensureLease = async () => {
    if (lost || !(await renewLease(db, owner))) {
      lost = true;
      throw new Error("采集租约已失效");
    }
  };
  const heartbeat = setInterval(() => {
    void renewLease(db, owner)
      .then((ok) => {
        if (!ok) lost = true;
      })
      .catch(() => {
        lost = true;
      });
  }, 20_000);
  heartbeat.unref();
  try {
    await initializeBoards(db);
    for (const board of mirrorBoards)
      await queueBoard(db, board.name, "scheduled");
    const states = await db.mirrorBoardState.findMany({
      where: { paused: false },
      select: { boardName: true },
    });
    const run = await db.mirrorRun.findFirst({
      where: {
        status: { in: ["queued", "collecting"] },
        boardName: { in: states.map((s) => s.boardName) },
      },
      orderBy: { updatedAt: "asc" },
    });
    if (run) {
      try {
        await collectSlice(
          db,
          source,
          getMirrorBoard(run.boardName),
          run,
          undefined,
          async () => {
            await ensureLease();
            const state = await db.mirrorBoardState.findUnique({
              where: { boardName: run.boardName },
            });
            if (state?.paused) {
              const error = new Error("版面已暂停");
              error.name = "MirrorPaused";
              throw error;
            }
          },
        );
      } catch (error) {
        if (error instanceof Error && error.name === "MirrorPaused")
          return { skipped: false };
        await ensureLease();
        const message = error instanceof Error ? error.message : "采集失败";
        await db.mirrorRun.update({
          where: { id: run.id },
          data: {
            status: "failed",
            errorMessage: message.slice(0, 300),
            finishedAt: new Date(),
          },
        });
        await db.mirrorBoardState.update({
          where: { boardName: run.boardName },
          data: {
            lastError: message.slice(0, 300),
            nextRunAt: new Date(Date.now() + 300_000),
          },
        });
      }
    }
    await ensureLease();
    await dispatchActions(db, ensureLease);
    return { skipped: false };
  } finally {
    clearInterval(heartbeat);
    await releaseLease(db, owner);
  }
}
const globalState = globalThis as typeof globalThis & {
  mirrorTimerStarted?: boolean;
};
export function startMirrorWorker() {
  if (!mirrorEnabled() || globalState.mirrorTimerStarted) return;
  globalState.mirrorTimerStarted = true;
  const loop = async () => {
    try {
      await runMirrorTick();
    } catch (error) {
      console.error("镜像调度异常", {
        type: error instanceof Error ? error.name : "unknown",
      });
    }
    const timer = setTimeout(loop, TICK_MS);
    timer.unref();
  };
  // 给 HTTP 服务留出启动时间，之后按完成时间递归调度，避免重叠。
  const timer = setTimeout(loop, 5000);
  timer.unref();
}
