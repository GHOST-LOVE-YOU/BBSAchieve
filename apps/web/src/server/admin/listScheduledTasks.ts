import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/src/server/db/client";
import { scheduledTasks } from "@/src/server/scheduler/taskRegistry";

type ScheduledTaskListClient = Pick<PrismaClient, "scheduledTaskRun">;

export async function listScheduledTasks(
  client: ScheduledTaskListClient = prisma,
) {
  const latestRuns = await client.scheduledTaskRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return scheduledTasks.map((task) => ({
    taskKey: task.taskKey,
    title: task.title,
    description: task.description,
    boardName: task.boardName,
    intervalMinutes: task.intervalMinutes,
    windowMinutes: task.windowMinutes,
    enabled: task.enabled,
    latestRun: latestRuns.find((run) => run.taskKey === task.taskKey) ?? null,
  }));
}
