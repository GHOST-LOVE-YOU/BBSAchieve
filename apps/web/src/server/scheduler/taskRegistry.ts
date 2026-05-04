import {
  getScheduledBoardTasks,
  type DerivedScheduledBoardTask,
} from "@/src/server/boardSync/boardRegistry";

export type ScheduledTaskDefinition = DerivedScheduledBoardTask;

export const scheduledTasks: readonly ScheduledTaskDefinition[] = getScheduledBoardTasks();

export function getScheduledTask(taskKey: string) {
  return scheduledTasks.find((task) => task.taskKey === taskKey) ?? null;
}
