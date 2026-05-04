export type BoardSyncDefinition = {
  boardName: string;
  boardSlug: string;
  title: string;
  description: string;
  fullSyncEnabled: boolean;
  fullSyncWindowMinutes: number;
  scheduledSyncEnabled: boolean;
  scheduledIntervalMinutes: number;
  scheduledWindowMinutes: number;
};

export type DerivedScheduledBoardTask = {
  taskKey: string;
  title: string;
  description: string;
  sourceType: "byr_sync_api";
  sourceLabel: string;
  boardName: string;
  intervalMinutes: number;
  windowMinutes: number;
  enabled: true;
  runnerType: "byr_sync_recent_window";
};

export const boardSyncBoards: readonly BoardSyncDefinition[] = [
  {
    boardName: "JobInfo",
    boardSlug: "job-info",
    title: "JobInfo 全量与定时同步",
    description: "管理员手动全量抓取 JobInfo，并按固定间隔同步最近内容。",
    fullSyncEnabled: true,
    fullSyncWindowMinutes: 60 * 24 * 365 * 10,
    scheduledSyncEnabled: true,
    scheduledIntervalMinutes: 120,
    scheduledWindowMinutes: 180,
  },
];

export function getBoardFullSyncDefinition(boardName: string) {
  return boardSyncBoards.find((board) => board.boardName === boardName) ?? null;
}

export function getScheduledBoardTasks(): DerivedScheduledBoardTask[] {
  return boardSyncBoards
    .filter((board) => board.scheduledSyncEnabled)
    .map((board) => ({
      taskKey: `${board.boardSlug}_recent_sync`,
      title: `${board.boardName} 最近内容同步`,
      description: `每 ${board.scheduledIntervalMinutes} 分钟同步一次 ${board.boardName} 最近 ${board.scheduledWindowMinutes} 分钟内容`,
      sourceType: "byr_sync_api" as const,
      sourceLabel: `${board.boardName} recent sync`,
      boardName: board.boardName,
      intervalMinutes: board.scheduledIntervalMinutes,
      windowMinutes: board.scheduledWindowMinutes,
      enabled: true,
      runnerType: "byr_sync_recent_window" as const,
    }));
}
