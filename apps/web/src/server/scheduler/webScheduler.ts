import { prisma } from "@/src/server/db/client";

import { runScheduledTask } from "./runScheduledTask";
import { scheduledTasks, type ScheduledTaskDefinition } from "./taskRegistry";

let schedulerStarted = false;

function readEnabledFlag() {
  const value = process.env.WEB_SCHEDULER_ENABLED?.trim().toLowerCase();
  return value !== "false";
}

function readRunOnBootFlag() {
  const value = process.env.WEB_SCHEDULER_RUN_ON_BOOT?.trim().toLowerCase();
  return value !== "false";
}

async function runTask(task: ScheduledTaskDefinition) {
  try {
    await runScheduledTask({
      prisma,
      task,
      triggerSource: "scheduled",
    });
  } catch (error) {
    console.error("Web scheduler task failed", {
      taskKey: task.taskKey,
      error,
    });
  }
}

function defaultScheduleTaskLoop(task: ScheduledTaskDefinition) {
  if (readRunOnBootFlag()) {
    void runTask(task);
  }

  const intervalMs = task.intervalMinutes * 60 * 1000;
  setInterval(() => {
    void runTask(task);
  }, intervalMs);
}

export async function startWebScheduler(deps?: {
  scheduleTaskLoop?: (task: ScheduledTaskDefinition) => void;
}) {
  if (schedulerStarted || !readEnabledFlag()) {
    return;
  }
  schedulerStarted = true;

  const scheduleTaskLoop = deps?.scheduleTaskLoop ?? defaultScheduleTaskLoop;
  for (const task of scheduledTasks) {
    if (!task.enabled) {
      continue;
    }
    scheduleTaskLoop(task);
  }
}
