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

export const scheduledTasks = [
  {
    taskKey: "iwhisper_recent_sync",
    title: "IWhisper 最近内容同步",
    description: "每 20 分钟同步一次 IWhisper 最近 30 分钟内的内容",
    sourceType: "byr_sync_api",
    sourceLabel: "IWhisper recent sync",
    boardName: "IWhisper",
    intervalMinutes: 20,
    windowMinutes: 30,
    enabled: true,
    runnerType: "byr_sync_recent_window",
  },
] as const satisfies readonly ScheduledTaskDefinition[];

export function getScheduledTask(taskKey: string) {
  return scheduledTasks.find((task) => task.taskKey === taskKey) ?? null;
}
