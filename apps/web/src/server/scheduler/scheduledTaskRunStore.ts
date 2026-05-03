import { Prisma } from "@prisma/client";
import type {
  PrismaClient,
  ScheduledTaskRunStatus,
  ScheduledTaskTriggerSource,
} from "@prisma/client";

export type ScheduledTaskRunStore = Pick<PrismaClient, "scheduledTaskRun">;

export async function createScheduledTaskRun(
  prisma: ScheduledTaskRunStore,
  input: {
    taskKey: string;
    taskTitle: string;
    triggerSource: ScheduledTaskTriggerSource;
    intervalMinutes: number;
    windowMinutes: number;
    boardName: string;
  },
) {
  return prisma.scheduledTaskRun.create({
    data: {
      taskKey: input.taskKey,
      taskTitle: input.taskTitle,
      triggerSource: input.triggerSource,
      status: "running" satisfies ScheduledTaskRunStatus,
      startedAt: new Date(),
      intervalMinutes: input.intervalMinutes,
      windowMinutes: input.windowMinutes,
      boardName: input.boardName,
    },
  });
}

export async function finishScheduledTaskRun(
  prisma: ScheduledTaskRunStore,
  runId: string,
  input: {
    status: ScheduledTaskRunStatus;
    importedThreads?: number;
    importedReplies?: number;
    skippedReason?: string | null;
    errorMessage?: string | null;
    metadataJson?: Prisma.InputJsonObject | null;
  },
) {
  const finishedAt = new Date();
  const run = await prisma.scheduledTaskRun.findUniqueOrThrow({
    where: { id: runId },
  });

  return prisma.scheduledTaskRun.update({
    where: { id: runId },
    data: {
      status: input.status,
      finishedAt,
      durationMs: finishedAt.getTime() - run.startedAt.getTime(),
      importedThreads: input.importedThreads ?? 0,
      importedReplies: input.importedReplies ?? 0,
      skippedReason: input.skippedReason ?? null,
      errorMessage: input.errorMessage ?? null,
      metadataJson: input.metadataJson ?? Prisma.JsonNull,
    },
  });
}
