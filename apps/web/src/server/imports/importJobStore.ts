import type { ImportJobStatus, ImportSourceType, PrismaClient } from "@prisma/client";

export type ImportJobStore = Pick<PrismaClient, "importJob">;

export type BoardFullSyncJobInput = {
  boardName: string;
  fullSyncWindowMinutes: number;
  requestedBy?: string | null;
};

export type LegacyImportJob = {
  id: string;
  jobType: string;
  sourceType: ImportSourceType;
  sourceLabel: string;
  status: ImportJobStatus;
  cursorThreadKey: string | null;
  lastProcessedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  processedThreads: number;
  processedReplies: number;
  skippedThreads: number;
  skippedReplies: number;
  errorMessage: string | null;
  progressNote: string | null;
};

export type JobProgressUpdate = {
  cursorThreadKey?: string | null;
  processedThreads?: number;
  processedReplies?: number;
  skippedThreads?: number;
  skippedReplies?: number;
  progressNote?: string | null;
  lastProcessedAt?: Date | null;
};

export function createLegacyImportJob(
  prisma: ImportJobStore,
) {
  return prisma.importJob.create({
    data: {
      jobType: "legacy_iwhisper_migration",
      sourceType: "legacy_postgres",
      sourceLabel: "legacy iwhisper",
      status: "pending",
      cursorThreadKey: null,
      lastProcessedAt: null,
      startedAt: null,
      finishedAt: null,
      processedThreads: 0,
      processedReplies: 0,
      skippedThreads: 0,
      skippedReplies: 0,
      errorMessage: null,
      progressNote: null,
    },
  });
}

export function createBoardFullSyncJob(
  prisma: ImportJobStore,
  input: BoardFullSyncJobInput,
) {
  return prisma.importJob.create({
    data: {
      jobType: "byr_board_full_sync",
      sourceType: "byr_sync_api",
      sourceLabel: input.boardName,
      status: "pending",
      cursorThreadKey: null,
      lastProcessedAt: null,
      startedAt: null,
      finishedAt: null,
      processedThreads: 0,
      processedReplies: 0,
      skippedThreads: 0,
      skippedReplies: 0,
      errorMessage: null,
      progressNote: null,
      metadataJson: {
        boardName: input.boardName,
        fullSyncWindowMinutes: input.fullSyncWindowMinutes,
        requestedBy: input.requestedBy ?? null,
      },
    },
  });
}

export function markJobRunning(
  prisma: ImportJobStore,
  jobId: string,
  cursorThreadKey?: string | null,
) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "running",
      startedAt: new Date(),
      cursorThreadKey: cursorThreadKey ?? null,
    },
  });
}

export function markJobPaused(
  prisma: ImportJobStore,
  jobId: string,
  progressNote?: string | null,
) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "paused",
      finishedAt: new Date(),
      progressNote: progressNote ?? null,
    },
  });
}

export function markJobCancelled(prisma: ImportJobStore, jobId: string) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "cancelled",
      finishedAt: new Date(),
    },
  });
}

export function updateJobProgress(
  prisma: ImportJobStore,
  jobId: string,
  progress: JobProgressUpdate,
) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      ...(progress.cursorThreadKey === undefined
        ? {}
        : { cursorThreadKey: progress.cursorThreadKey }),
      ...(progress.processedThreads === undefined
        ? {}
        : { processedThreads: progress.processedThreads }),
      ...(progress.processedReplies === undefined
        ? {}
        : { processedReplies: progress.processedReplies }),
      ...(progress.skippedThreads === undefined
        ? {}
        : { skippedThreads: progress.skippedThreads }),
      ...(progress.skippedReplies === undefined
        ? {}
        : { skippedReplies: progress.skippedReplies }),
      ...(progress.progressNote === undefined
        ? {}
        : { progressNote: progress.progressNote }),
      ...(progress.lastProcessedAt === undefined
        ? {}
        : { lastProcessedAt: progress.lastProcessedAt }),
    },
  });
}

export function findJobById(
  prisma: ImportJobStore,
  jobId: string,
) {
  return prisma.importJob.findUnique({ where: { id: jobId } });
}

export function markJobSucceeded(
  prisma: ImportJobStore,
  jobId: string,
) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "succeeded",
      finishedAt: new Date(),
    },
  });
}

export function markJobFailed(
  prisma: ImportJobStore,
  jobId: string,
  errorMessage: string,
) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "failed",
      finishedAt: new Date(),
      errorMessage,
    },
  });
}
