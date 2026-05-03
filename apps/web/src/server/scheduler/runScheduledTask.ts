import type { PrismaClient } from "@prisma/client";

import { runByrSyncImport } from "@/app/admin/api/imports/byr-sync/route";

import {
  createScheduledTaskRun,
  finishScheduledTaskRun,
  type ScheduledTaskRunStore,
} from "./scheduledTaskRunStore";
import type { ScheduledTaskDefinition } from "./taskRegistry";

type RunScheduledTaskPrisma = Pick<PrismaClient, "thread"> &
  Pick<PrismaClient, "import" | "board" | "user" | "botProfile" | "reply"> &
  ScheduledTaskRunStore;

const runningTaskKeys = new Set<string>();

export async function runScheduledTask(input: {
  prisma: RunScheduledTaskPrisma;
  task: ScheduledTaskDefinition;
  triggerSource: "scheduled" | "manual";
}) {
  if (runningTaskKeys.has(input.task.taskKey)) {
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
      skippedReason: "previous run still active",
    });
  }

  runningTaskKeys.add(input.task.taskKey);
  const run = await createScheduledTaskRun(input.prisma, {
    taskKey: input.task.taskKey,
    taskTitle: input.task.title,
    triggerSource: input.triggerSource,
    intervalMinutes: input.task.intervalMinutes,
    windowMinutes: input.task.windowMinutes,
    boardName: input.task.boardName,
  });

  try {
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
    return await finishScheduledTaskRun(input.prisma, run.id, {
      status: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Unknown scheduled task error",
    });
  } finally {
    runningTaskKeys.delete(input.task.taskKey);
  }
}
