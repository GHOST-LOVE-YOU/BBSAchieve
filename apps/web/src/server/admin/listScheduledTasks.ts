import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/src/server/db/client";
import { scheduledTasks } from "@/src/server/scheduler/taskRegistry";

type ScheduledTaskListClient = Pick<PrismaClient, "scheduledTaskRun">;

export async function listScheduledTasks(
  client: ScheduledTaskListClient = prisma,
) {
  const taskKeys = scheduledTasks.map((task) => task.taskKey);
  const runs = await client.scheduledTaskRun.findMany({
    where: {
      taskKey: {
        in: taskKeys,
      },
    },
    orderBy: { startedAt: "desc" },
  });
  const latestRunByTaskKey = new Map<string, (typeof runs)[number]>();

  for (const run of runs) {
    if (!latestRunByTaskKey.has(run.taskKey)) {
      latestRunByTaskKey.set(run.taskKey, run);
    }
  }

  return scheduledTasks.map((task) => ({
    taskKey: task.taskKey,
    title: task.title,
    description: task.description,
    boardName: task.boardName,
    intervalMinutes: task.intervalMinutes,
    windowMinutes: task.windowMinutes,
    enabled: task.enabled,
    latestRun: latestRunByTaskKey.get(task.taskKey) ?? null,
  }));
}
