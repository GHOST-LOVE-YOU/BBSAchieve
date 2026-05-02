import type { PrismaClient } from "@prisma/client";

import { prisma } from "../db/client";

export type RecentImportActivity = {
  id: string;
  kind: "import" | "import_job";
  title: string;
  status: string;
  happenedAt: string;
  detail?: string | null;
};

type RecentImportActivityClient = Pick<PrismaClient, "import" | "importJob">;

function toIsoString(value: Date | null | undefined): string {
  return value ? value.toISOString() : new Date(0).toISOString();
}

function compareRecentActivityDesc(
  left: RecentImportActivity,
  right: RecentImportActivity,
): number {
  const leftTime = new Date(left.happenedAt).getTime();
  const rightTime = new Date(right.happenedAt).getTime();

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return left.id === right.id ? 0 : left.id > right.id ? -1 : 1;
}

export async function listRecentImportActivity(
  client: RecentImportActivityClient = prisma,
): Promise<RecentImportActivity[]> {
  const [imports, importJobs] = await Promise.all([
    client.import.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        sourceLabel: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        importedThreads: true,
        importedReplies: true,
        errorMessage: true,
      },
    }),
    client.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        jobType: true,
        sourceLabel: true,
        status: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        processedThreads: true,
        processedReplies: true,
        errorMessage: true,
      },
    }),
  ]);

  const activity = [
    ...imports.map((item) => ({
      id: `import:${item.id}`,
      kind: "import" as const,
      title: item.sourceLabel,
      status: item.status,
      happenedAt: toIsoString(item.finishedAt ?? item.startedAt),
      detail:
        item.errorMessage ??
        `帖子 ${item.importedThreads}，回复 ${item.importedReplies}`,
    })),
    ...importJobs.map((job) => ({
      id: `import-job:${job.id}`,
      kind: "import_job" as const,
      title: job.sourceLabel || job.jobType,
      status: job.status,
      happenedAt: toIsoString(job.finishedAt ?? job.startedAt ?? job.createdAt),
      detail:
        job.errorMessage ??
        `帖子 ${job.processedThreads}，回复 ${job.processedReplies}`,
    })),
  ].sort(compareRecentActivityDesc);

  return activity;
}
