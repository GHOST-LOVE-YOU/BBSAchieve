import { getScheduledBoardTasks } from "@/src/server/boardSync/boardRegistry";

export type ScheduledTaskDefinition = {
  taskKey: string;
  title: string;
  description: string;
  sourceType: "byr_sync_api";
  sourceLabel: string;
  boardName: string;
  intervalMinutes: number;
  windowMinutes: number;
  enabled: boolean;
  runnerType: "byr_sync_recent_window";
};

export const scheduledTasks =
  getScheduledBoardTasks() as const satisfies readonly ScheduledTaskDefinition[];

export function getScheduledTask(taskKey: string) {
  return scheduledTasks.find((task) => task.taskKey === taskKey) ?? null;
}
