export type BoardCatalogEntry = {
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

export const boardCatalog: readonly BoardCatalogEntry[] = [
  {
    boardName: "IWhisper",
    boardSlug: "iwhisper",
    title: "IWhisper 全量与定时同步",
    description: "悄悄话板块，支持全量和定时同步。",
    fullSyncEnabled: true,
    fullSyncWindowMinutes: 60 * 24 * 365 * 10,
    scheduledSyncEnabled: true,
    scheduledIntervalMinutes: 20,
    scheduledWindowMinutes: 30,
  },
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
