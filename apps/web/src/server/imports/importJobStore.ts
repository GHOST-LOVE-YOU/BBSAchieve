import type { PrismaClient } from "@prisma/client";

import { createBatchJobMetadata } from "./boardBatchJobMetadata";

export type ImportJobStore = Pick<PrismaClient, "importJob">;

export type BoardFullSyncJobInput = {
  boardName: string;
  fullSyncWindowMinutes: number;
  requestedBy?: string | null;
};

export type BoardBatchFullSyncJobInput = {
  selectedBoardNames: string[];
  orderedBoardNames: string[];
};

export type JobProgressUpdate = {
  cursorThreadKey?: string | null;
  processedThreads?: number;
  processedReplies?: number;
  skippedThreads?: number;
  skippedReplies?: number;
  progressNote?: string | null;
  lastProcessedAt?: Date | null;
  metadataJson?: unknown;
};

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

export function createBoardBatchFullSyncJob(
  prisma: ImportJobStore,
  input: BoardBatchFullSyncJobInput,
) {
  return prisma.importJob.create({
    data: {
      jobType: "byr_board_full_sync_batch",
      sourceType: "byr_sync_api",
      sourceLabel: "multi-board full sync",
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
      metadataJson: createBatchJobMetadata({
        selectedBoardNames: input.selectedBoardNames,
        orderedBoardNames: input.orderedBoardNames,
      }),
    },
  });
}

export function markJobRunning(
  prisma: ImportJobStore,
  jobId: string,
  cursorThreadKey?: string | null,
) {
  return prisma.importJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["pending", "paused", "failed"] },
    },
    data: {
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      cursorThreadKey: cursorThreadKey ?? null,
      errorMessage: null,
      progressNote: null,
    },
  });
}

export function markJobPaused(
  prisma: ImportJobStore,
  jobId: string,
  progressNote?: string | null,
) {
  return prisma.importJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["pending", "running"] },
    },
    data: {
      status: "paused",
      finishedAt: new Date(),
      progressNote: progressNote ?? null,
    },
  });
}

export function markJobCancelled(prisma: ImportJobStore, jobId: string) {
  return prisma.importJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["pending", "running", "paused", "failed"] },
    },
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
      ...(progress.metadataJson === undefined
        ? {}
        : { metadataJson: progress.metadataJson }),
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
  progress?: Pick<
    JobProgressUpdate,
    "processedThreads" | "processedReplies" | "skippedThreads" | "skippedReplies" | "progressNote"
  >,
) {
  return prisma.importJob.updateMany({
    where: {
      id: jobId,
      status: "running",
    },
    data: {
      status: "succeeded",
      finishedAt: new Date(),
      ...(progress?.processedThreads === undefined
        ? {}
        : { processedThreads: progress.processedThreads }),
      ...(progress?.processedReplies === undefined
        ? {}
        : { processedReplies: progress.processedReplies }),
      ...(progress?.skippedThreads === undefined
        ? {}
        : { skippedThreads: progress.skippedThreads }),
      ...(progress?.skippedReplies === undefined
        ? {}
        : { skippedReplies: progress.skippedReplies }),
      ...(progress?.progressNote === undefined
        ? {}
        : { progressNote: progress.progressNote }),
    },
  });
}

export function markJobFailed(
  prisma: ImportJobStore,
  jobId: string,
  errorMessage: string,
) {
  return prisma.importJob.updateMany({
    where: {
      id: jobId,
      status: "running",
    },
    data: {
      status: "failed",
      finishedAt: new Date(),
      errorMessage,
    },
  });
}
