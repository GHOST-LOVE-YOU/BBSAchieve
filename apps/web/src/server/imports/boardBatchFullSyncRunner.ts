import { runByrSyncImport } from "@/app/admin/api/imports/byr-sync/route";
import { getBoardFullSyncDefinition } from "@/src/server/boardSync/boardRegistry";

import {
  getCurrentBoardName,
  getCurrentBoardPage,
  markBoardCompleted,
  markBoardFailed,
  markBoardPageCompleted,
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
  getBoardFullSyncWindowMinutes?: (boardName: string) => number;
  boardPageChunkSize?: number;
  sleepBetweenBoards?: (input: {
    completedBoardName: string;
    nextBoardName: string;
  }) => Promise<void>;
};

type BatchRunnerInput = {
  jobId: string;
  alreadyMarkedRunning?: boolean;
  acquireThrottle: () => { acquired: boolean; holder: unknown };
  releaseThrottle: () => void;
};

function sumBoardStat(
  metadata: BoardBatchJobMetadata,
  key: "processedThreads" | "processedReplies" | "skippedThreads",
) {
  return Object.values(metadata.perBoardStats).reduce(
    (sum, stat) => sum + (stat[key] ?? 0),
    0,
  );
}

function formatSkippedThreadNote(
  skippedThreadDetails:
    | Array<{
        board_name: string;
        article_id: string;
        title: string;
        page: number | null;
        reason: string;
      }>
    | undefined,
) {
  if (!skippedThreadDetails || skippedThreadDetails.length === 0) {
    return "";
  }

  const first = skippedThreadDetails[0]!;
  const page = first.page === null ? "?" : String(first.page);
  return `，跳过 ${skippedThreadDetails.length} 个帖子：${first.board_name}/${first.article_id} 第 ${page} 页 ${first.reason}`;
}

export async function runBoardBatchFullSyncJob(
  deps: BatchRunnerDeps,
  input: BatchRunnerInput,
) {
  const runImport = deps.runByrSyncImport ?? runByrSyncImport;
  const boardPageChunkSize = deps.boardPageChunkSize ?? 3;
  const getBoardFullSyncWindowMinutes =
    deps.getBoardFullSyncWindowMinutes ??
    ((boardName: string) => {
      const board = getBoardFullSyncDefinition(boardName);
      if (!board) {
        throw new Error(`Unknown board full sync configuration for "${boardName}"`);
      }
      if (!board.fullSyncEnabled) {
        throw new Error(`Board "${boardName}" is not enabled for full sync`);
      }
      return board.fullSyncWindowMinutes;
    });
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
    const pauseResult = await deps.markJobPaused(
      input.jobId,
      `等待全局抓取窗口，当前板块 ${getCurrentBoardName(metadata) ?? "—"}`,
    );

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
      const latestJob = await deps.findJobById(input.jobId);
      if (!latestJob) {
        throw new Error(`Batch job ${input.jobId} not found`);
      }

      if (latestJob.status === "cancelled") {
        return { status: "cancelled" as const };
      }

      const boardName = current.orderedBoardNames[index]!;

      try {
        let boardCompleted = false;
        while (!boardCompleted) {
          const startPage = getCurrentBoardPage(current, boardName);
          const importResult = await runImport({
            prisma: deps.prisma as never,
            boardName,
            windowMinutes: getBoardFullSyncWindowMinutes(boardName),
            limit: null,
            startPage,
            maxPages: boardPageChunkSize,
          });
          const importedThreads = importResult.importedThreads ?? 0;
          const importedReplies = importResult.importedReplies ?? 0;
          const skippedThreads = importResult.skippedThreads ?? 0;

          if (importResult.hasMore && importResult.nextPage) {
            const pageMetadata = markBoardPageCompleted(current, {
              boardName,
              nextPage: importResult.nextPage,
              processedThreads: importedThreads,
              processedReplies: importedReplies,
              skippedThreads,
            });
            await deps.updateJobProgress(input.jobId, {
              metadataJson: pageMetadata,
              processedThreads: sumBoardStat(pageMetadata, "processedThreads"),
              processedReplies: sumBoardStat(pageMetadata, "processedReplies"),
              skippedThreads: sumBoardStat(pageMetadata, "skippedThreads"),
              progressNote: `当前板块 ${boardName}，下一页 ${importResult.nextPage}${formatSkippedThreadNote(
                importResult.skippedThreadDetails,
              )}`,
            });
            current = pageMetadata;

            const latestJob = await deps.findJobById(input.jobId);
            if (!latestJob) {
              throw new Error(`Batch job ${input.jobId} not found`);
            }
            if (latestJob.status === "cancelled") {
              return { status: "cancelled" as const };
            }

            continue;
          }

          const currentStats = current.perBoardStats[boardName] ?? {
            processedThreads: 0,
            processedReplies: 0,
          };
          const nextMetadata = markBoardCompleted(current, {
            boardName,
            processedThreads: currentStats.processedThreads + importedThreads,
            processedReplies: currentStats.processedReplies + importedReplies,
            skippedThreads: (currentStats.skippedThreads ?? 0) + skippedThreads,
          });

          try {
            await deps.updateJobProgress(input.jobId, {
              metadataJson: nextMetadata,
              processedThreads: sumBoardStat(nextMetadata, "processedThreads"),
              processedReplies: sumBoardStat(nextMetadata, "processedReplies"),
              skippedThreads: sumBoardStat(nextMetadata, "skippedThreads"),
              progressNote: nextMetadata.currentBoardName
                ? `当前板块 ${nextMetadata.currentBoardName}${formatSkippedThreadNote(
                    importResult.skippedThreadDetails,
                  )}`
                : `全部板块已完成${formatSkippedThreadNote(
                    importResult.skippedThreadDetails,
                  )}`,
            });
            current = nextMetadata;
            boardCompleted = true;
            if (nextMetadata.currentBoardName) {
              await deps.sleepBetweenBoards?.({
                completedBoardName: boardName,
                nextBoardName: nextMetadata.currentBoardName,
              });
            }
          } catch (error) {
            const failedMetadata = nextMetadata.currentBoardName
              ? markBoardFailed(nextMetadata, nextMetadata.currentBoardName)
              : nextMetadata;
            await deps.updateJobProgress(input.jobId, {
              metadataJson: failedMetadata,
              progressNote: failedMetadata.failedBoardName
                ? `板块 ${failedMetadata.failedBoardName} 失败`
                : "全部板块已完成",
            });
            const failedResult = await deps.markJobFailed(
              input.jobId,
              error instanceof Error ? error.message : "Unknown batch full sync error",
            );
            if (
              failedResult &&
              typeof failedResult === "object" &&
              "count" in failedResult &&
              failedResult.count === 0
            ) {
              return { status: "cancelled" as const };
            }
            return { status: "failed" as const };
          }
        }
      } catch (error) {
        const failedMetadata = markBoardFailed(current, boardName);
        await deps.updateJobProgress(input.jobId, {
          metadataJson: failedMetadata,
          progressNote: `板块 ${boardName} 失败`,
        });
        const failedResult = await deps.markJobFailed(
          input.jobId,
          error instanceof Error ? error.message : "Unknown batch full sync error",
        );
        if (
          failedResult &&
          typeof failedResult === "object" &&
          "count" in failedResult &&
          failedResult.count === 0
        ) {
          return { status: "cancelled" as const };
        }
        return { status: "failed" as const };
      }
    }

    const succeededResult = await deps.markJobSucceeded(input.jobId);
    if (
      succeededResult &&
      typeof succeededResult === "object" &&
      "count" in succeededResult &&
      succeededResult.count === 0
    ) {
      return { status: "cancelled" as const };
    }
    return { status: "succeeded" as const };
  } finally {
    input.releaseThrottle();
  }
}
