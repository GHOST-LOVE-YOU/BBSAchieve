import type { PrismaClient } from "@prisma/client";

import { runByrSyncImport } from "@/app/admin/api/imports/byr-sync/route";
import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

import {
  createScheduledTaskRun,
  finishScheduledTaskRun,
  type ScheduledTaskRunStore,
} from "./scheduledTaskRunStore";
import type { ScheduledTaskDefinition } from "./taskRegistry";

type RunScheduledTaskPrisma = Pick<PrismaClient, "thread"> &
  Pick<PrismaClient, "import" | "board" | "user" | "botProfile" | "reply"> &
  ScheduledTaskRunStore;

export async function runScheduledTask(input: {
  prisma: RunScheduledTaskPrisma;
  task: ScheduledTaskDefinition;
  triggerSource: "scheduled" | "manual";
}) {
  const ownerKey = `${input.triggerSource}:${input.task.taskKey}`;
  const throttle = tryAcquireGlobalSyncThrottle({
    ownerKey,
    triggerSource: input.triggerSource,
  });

  if (!throttle.acquired) {
    const skippedRun = await createScheduledTaskRun(input.prisma, {
      taskKey: input.task.taskKey,
      taskTitle: input.task.title,
      triggerSource: input.triggerSource,
      intervalMinutes: input.task.intervalMinutes,
      windowMinutes: input.task.windowMinutes,
      boardName: input.task.boardName,
    });

    return finishScheduledTaskRun(input.prisma, skippedRun.id, {
      status: "skipped",
      skippedReason: "global throttle active",
    });
  }
  let run:
    | Awaited<ReturnType<typeof createScheduledTaskRun>>
    | null = null;

  try {
    run = await createScheduledTaskRun(input.prisma, {
      taskKey: input.task.taskKey,
      taskTitle: input.task.title,
      triggerSource: input.triggerSource,
      intervalMinutes: input.task.intervalMinutes,
      windowMinutes: input.task.windowMinutes,
      boardName: input.task.boardName,
    });

    const importResult = await runByrSyncImport({
      prisma: input.prisma,
      boardName: input.task.boardName,
      windowMinutes: input.task.windowMinutes,
    });

    return await finishScheduledTaskRun(input.prisma, run.id, {
      status: "succeeded",
      importedThreads: importResult.importedThreads,
      importedReplies: importResult.importedReplies,
    });
  } catch (error) {
    if (!run) {
      throw error;
    }

    const failedRun = await finishScheduledTaskRun(input.prisma, run.id, {
      status: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Unknown scheduled task error",
    });

    if (input.triggerSource === "scheduled") {
      console.error("Scheduled task run failed", {
        taskKey: input.task.taskKey,
        taskTitle: input.task.title,
        triggerSource: input.triggerSource,
        runId: failedRun.id,
        errorMessage: failedRun.errorMessage,
      });
    }

    return failedRun;
  } finally {
    releaseGlobalSyncThrottle(ownerKey);
  }
}
