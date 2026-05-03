import { prisma } from "@/src/server/db/client";

import { runScheduledTask } from "./runScheduledTask";
import { scheduledTasks, type ScheduledTaskDefinition } from "./taskRegistry";

type SchedulerIntervalHandle = ReturnType<typeof setInterval>;

type WebSchedulerState = {
  started: boolean;
  intervalHandles: SchedulerIntervalHandle[];
};

const globalForWebScheduler = globalThis as typeof globalThis & {
  __bbsWebSchedulerState__?: WebSchedulerState;
};

function getSchedulerState(): WebSchedulerState {
  if (!globalForWebScheduler.__bbsWebSchedulerState__) {
    globalForWebScheduler.__bbsWebSchedulerState__ = {
      started: false,
      intervalHandles: [],
    };
  }

  return globalForWebScheduler.__bbsWebSchedulerState__;
}

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
  const state = getSchedulerState();

  if (readRunOnBootFlag()) {
    void runTask(task);
  }

  const intervalMs = task.intervalMinutes * 60 * 1000;
  const intervalHandle = setInterval(() => {
    void runTask(task);
  }, intervalMs);

  if (typeof intervalHandle.unref === "function") {
    intervalHandle.unref();
  }

  state.intervalHandles.push(intervalHandle);
}

export async function startWebScheduler(deps?: {
  scheduleTaskLoop?: (task: ScheduledTaskDefinition) => void;
}) {
  const state = getSchedulerState();

  if (state.started || !readEnabledFlag()) {
    return;
  }

  const scheduleTaskLoop = deps?.scheduleTaskLoop ?? defaultScheduleTaskLoop;

  try {
    for (const task of scheduledTasks) {
      if (!task.enabled) {
        continue;
      }
      scheduleTaskLoop(task);
    }

    state.started = true;
  } catch (error) {
    state.started = false;
    throw error;
  }
}
