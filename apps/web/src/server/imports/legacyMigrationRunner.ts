import { mapLegacyRows } from "./mapLegacyRows";
import type { LegacyImportRows } from "./legacyTypes";
import type { LegacyIwhisperBatch } from "./fetchLegacyIwhisperBatch";
import type { NormalizedImportBatch } from "./syncTypes";

export type LegacyMigrationRunnerJob = {
  id: string;
  cursorThreadKey: string | null;
};

export type LegacyMigrationRunnerDeps = {
  findJobById: (jobId: string) => Promise<LegacyMigrationRunnerJob | null>;
  markJobRunning: (jobId: string, cursorThreadKey?: string | null) => Promise<unknown>;
  markJobPaused?: (jobId: string) => Promise<unknown>;
  updateJobProgress: (
    jobId: string,
    progress: {
      cursorThreadKey?: string | null;
      processedThreads?: number;
      processedReplies?: number;
      skippedReplies?: number;
      progressNote?: string | null;
      lastProcessedAt?: Date | null;
    },
  ) => Promise<unknown>;
  markJobFailed: (jobId: string, errorMessage: string) => Promise<unknown>;
  markJobSucceeded: (jobId: string) => Promise<unknown>;
  fetchBatch: (options: {
    limit: number;
    cursorThreadKey?: string | null;
  }) => Promise<LegacyIwhisperBatch>;
  importBatch: (batch: NormalizedImportBatch) => Promise<{
    importedThreads: number;
    importedReplies: number;
    skippedReplies: number;
  }>;
  batchSize?: number;
  mapRows?: (rows: LegacyImportRows) => NormalizedImportBatch;
};

export type LegacyMigrationRunnerResult = {
  status: "succeeded" | "failed";
  processedThreads: number;
  processedReplies: number;
  skippedReplies: number;
  cursorThreadKey: string | null;
};

function accumulateCounts(batchResult: {
  importedThreads: number;
  importedReplies: number;
  skippedReplies: number;
}) {
  return {
    processedThreads: batchResult.importedThreads,
    processedReplies: batchResult.importedReplies,
    skippedReplies: batchResult.skippedReplies,
  };
}

function getBatchCursor(batch: LegacyIwhisperBatch): string | null {
  const lastPost = batch.rows.posts[batch.rows.posts.length - 1];
  return lastPost ? `${lastPost.updatedAt.toISOString()}|${lastPost.id}` : null;
}

export async function runLegacyMigrationJob(
  deps: LegacyMigrationRunnerDeps,
  jobId: string,
): Promise<LegacyMigrationRunnerResult> {
  const job = await deps.findJobById(jobId);
  if (!job) {
    throw new Error(`missing import job ${jobId}`);
  }

  const batchSize = deps.batchSize ?? 50;
  let cursorThreadKey = job.cursorThreadKey;
  let processedThreads = 0;
  let processedReplies = 0;
  let skippedReplies = 0;

  await deps.markJobRunning(jobId, cursorThreadKey);

  try {
    while (true) {
      const batch = await deps.fetchBatch({
        limit: batchSize,
        cursorThreadKey,
      });

      if (batch.rows.posts.length === 0) {
        await deps.markJobSucceeded(jobId);
        return {
          status: "succeeded",
          processedThreads,
          processedReplies,
          skippedReplies,
          cursorThreadKey,
        };
      }

      const normalizedBatch = deps.mapRows ? deps.mapRows(batch.rows) : mapLegacyRows(batch.rows);
      const batchResult = await deps.importBatch(normalizedBatch);
      const counts = accumulateCounts(batchResult);

      processedThreads += counts.processedThreads;
      processedReplies += counts.processedReplies;
      skippedReplies += counts.skippedReplies;

      cursorThreadKey = getBatchCursor(batch);

      await deps.updateJobProgress(jobId, {
        cursorThreadKey,
        processedThreads,
        processedReplies,
        skippedReplies,
        lastProcessedAt: batch.rows.posts[batch.rows.posts.length - 1]?.updatedAt ?? null,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown migration failure";
    await deps.markJobFailed(jobId, message);
    return {
      status: "failed",
      processedThreads,
      processedReplies,
      skippedReplies,
      cursorThreadKey,
    };
  }
}
