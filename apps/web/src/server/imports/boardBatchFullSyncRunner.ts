import { runByrSyncImport } from "@/app/admin/api/imports/byr-sync/route";

import {
  getCurrentBoardName,
  markBoardCompleted,
  markBoardFailed,
  type BoardBatchJobMetadata,
} from "./boardBatchJobMetadata";

type BatchRunnerDeps = {
  findJobById: (jobId: string) => Promise<{
    id: string;
    status: string;
    metadataJson: BoardBatchJobMetadata;
  } | null>;
  markJobPaused: (jobId: string, progressNote: string) => Promise<{ count: number } | unknown>;
  markJobRunning: (jobId: string) => Promise<{ count: number } | unknown>;
  updateJobProgress: (jobId: string, progress: Record<string, unknown>) => Promise<unknown>;
  markJobSucceeded: (jobId: string) => Promise<{ count: number } | unknown>;
  markJobFailed: (jobId: string, errorMessage: string) => Promise<{ count: number } | unknown>;
  prisma: unknown;
  runByrSyncImport?: typeof runByrSyncImport;
};

type BatchRunnerInput = {
  jobId: string;
  alreadyMarkedRunning?: boolean;
  acquireThrottle: () => { acquired: boolean; holder: unknown };
  releaseThrottle: () => void;
};

export async function runBoardBatchFullSyncJob(
  deps: BatchRunnerDeps,
  input: BatchRunnerInput,
) {
  const runImport = deps.runByrSyncImport ?? runByrSyncImport;
  const job = await deps.findJobById(input.jobId);

  if (!job) {
    throw new Error(`Batch job ${input.jobId} not found`);
  }

  if (job.status === "cancelled") {
    return { status: "cancelled" as const };
  }

  const metadata = job.metadataJson;
  const throttle = input.acquireThrottle();

  if (!throttle.acquired) {
    const pauseResult = input.alreadyMarkedRunning
      ? await deps.markJobPaused(
          input.jobId,
          `等待全局抓取窗口，当前板块 ${getCurrentBoardName(metadata) ?? "—"}`,
        )
      : await deps.updateJobProgress(input.jobId, {
          progressNote: `等待全局抓取窗口，当前板块 ${getCurrentBoardName(metadata) ?? "—"}`,
        });

    if (
      pauseResult &&
      typeof pauseResult === "object" &&
      "count" in pauseResult &&
      pauseResult.count === 0
    ) {
      return { status: "cancelled" as const };
    }

    return { status: "paused" as const };
  }

  try {
    if (!input.alreadyMarkedRunning) {
      const runningResult = await deps.markJobRunning(input.jobId);
      if (
        runningResult &&
        typeof runningResult === "object" &&
        "count" in runningResult &&
        runningResult.count === 0
      ) {
        return { status: "cancelled" as const };
      }
    }

    let current = metadata;

    for (
      let index = current.currentBoardIndex;
      index < current.orderedBoardNames.length;
      index += 1
    ) {
      const boardName = current.orderedBoardNames[index]!;

      try {
        const importResult = await runImport({
          prisma: deps.prisma as never,
          boardName,
          windowMinutes: 60 * 24 * 365 * 10,
          limit: null,
        });

        current = markBoardCompleted(current, {
          boardName,
          processedThreads: importResult.importedThreads,
          processedReplies: importResult.importedReplies,
        });

        await deps.updateJobProgress(input.jobId, {
          metadataJson: current,
          processedThreads: Object.values(current.perBoardStats).reduce(
            (sum, stat) => sum + stat.processedThreads,
            0,
          ),
          processedReplies: Object.values(current.perBoardStats).reduce(
            (sum, stat) => sum + stat.processedReplies,
            0,
          ),
          progressNote: current.currentBoardName
            ? `当前板块 ${current.currentBoardName}`
            : "全部板块已完成",
        });
      } catch (error) {
        current = markBoardFailed(current, boardName);
        await deps.updateJobProgress(input.jobId, {
          metadataJson: current,
          progressNote: `板块 ${boardName} 失败`,
        });
        await deps.markJobFailed(
          input.jobId,
          error instanceof Error ? error.message : "Unknown batch full sync error",
        );
        return { status: "failed" as const };
      }
    }

    await deps.markJobSucceeded(input.jobId);
    return { status: "succeeded" as const };
  } finally {
    input.releaseThrottle();
  }
}
