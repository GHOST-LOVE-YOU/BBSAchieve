export type BoardCatalogSectionEntry = {
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

export type BoardCatalogSection = {
  sectionName: string;
  sectionSlug: string;
  boards: readonly BoardCatalogSectionEntry[];
};

export type BoardCatalogEntry = BoardCatalogSectionEntry & {
  sectionName: string;
  sectionSlug: string;
};

export const boardCatalogSections: readonly BoardCatalogSection[] = [
  {
    sectionName: "校园生活",
    sectionSlug: "campus-life",
    boards: [
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
        boardName: "Talking",
        boardSlug: "talking",
        title: "Talking 全量与定时同步",
        description: "管理员可手动全量抓取 Talking，定时任务默认关闭。",
        fullSyncEnabled: true,
        fullSyncWindowMinutes: 60 * 24 * 365 * 10,
        scheduledSyncEnabled: false,
        scheduledIntervalMinutes: 120,
        scheduledWindowMinutes: 180,
      },
    ],
  },
  {
    sectionName: "求职实习",
    sectionSlug: "jobs-and-internships",
    boards: [
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
    ],
  },
];

export const boardCatalog: readonly BoardCatalogEntry[] = boardCatalogSections.flatMap((section) =>
  section.boards.map((board) => ({
    ...board,
    sectionName: section.sectionName,
    sectionSlug: section.sectionSlug,
  })),
);
