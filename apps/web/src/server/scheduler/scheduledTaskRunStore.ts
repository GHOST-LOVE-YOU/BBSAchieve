import { Prisma } from "@prisma/client";
import type {
  PrismaClient,
  ScheduledTaskRunStatus,
  ScheduledTaskTriggerSource,
} from "@prisma/client";

type ScheduledTaskRunDelegate = PrismaClient["scheduledTaskRun"];

type ScheduledTaskRunTerminalStatus = Exclude<ScheduledTaskRunStatus, "running">;

export type ScheduledTaskRunStore = {
  scheduledTaskRun: Pick<
    ScheduledTaskRunDelegate,
    "create" | "findUniqueOrThrow" | "update" | "updateMany"
  >;
};

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
    status: ScheduledTaskRunTerminalStatus;
    importedThreads?: number;
    importedReplies?: number;
    skippedReason?: string | null;
    errorMessage?: string | null;
    metadataJson?: Prisma.InputJsonValue | null;
  },
) {
  const finishedAt = new Date();
  const run = await prisma.scheduledTaskRun.findUniqueOrThrow({
    where: { id: runId },
  });

  if (run.status !== "running") {
    throw new Error(`scheduled task run ${runId} is already finalized as ${run.status}`);
  }

  const result = await prisma.scheduledTaskRun.updateMany({
    where: {
      id: runId,
      status: "running",
    },
    data: {
      status: input.status,
      finishedAt,
      durationMs: finishedAt.getTime() - run.startedAt.getTime(),
      importedThreads: input.importedThreads ?? 0,
      importedReplies: input.importedReplies ?? 0,
      skippedReason: input.skippedReason ?? null,
      errorMessage: input.errorMessage ?? null,
      ...(input.metadataJson === undefined
        ? {}
        : {
            metadataJson:
              input.metadataJson === null ? Prisma.DbNull : input.metadataJson,
          }),
    },
  });

  if (result.count !== 1) {
    throw new Error(`scheduled task run ${runId} could not be finalized from running state`);
  }

  return prisma.scheduledTaskRun.findUniqueOrThrow({
    where: { id: runId },
  });
}
