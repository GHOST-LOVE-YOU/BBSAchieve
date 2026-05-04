import { runByrSyncImport } from "@/app/admin/api/imports/byr-sync/route";

type BoardFullSyncMetadata = {
  boardName: string;
  fullSyncWindowMinutes: number;
};

function readBoardFullSyncMetadata(
  metadataJson: unknown,
): BoardFullSyncMetadata {
  const metadata =
    metadataJson && typeof metadataJson === "object"
      ? (metadataJson as Record<string, unknown>)
      : {};
  const missingFields: string[] = [];
  const boardName = metadata.boardName;
  const fullSyncWindowMinutes = metadata.fullSyncWindowMinutes;

  if (typeof boardName !== "string" || boardName.trim().length === 0) {
    missingFields.push("boardName");
  }

  if (typeof fullSyncWindowMinutes !== "number") {
    missingFields.push("fullSyncWindowMinutes");
  }

  if (missingFields.length > 0) {
    throw new Error(
      `missing board full sync metadata: ${missingFields.join(", ")}`,
    );
  }

  const validatedBoardName = boardName as string;
  const validatedFullSyncWindowMinutes = fullSyncWindowMinutes as number;

  if (
    !Number.isFinite(validatedFullSyncWindowMinutes) ||
    validatedFullSyncWindowMinutes <= 0
  ) {
    throw new Error("invalid board full sync metadata: fullSyncWindowMinutes");
  }

  return {
    boardName: validatedBoardName,
    fullSyncWindowMinutes: validatedFullSyncWindowMinutes,
  };
}

export async function runBoardFullSyncJob(
  deps: {
    findJobById: (jobId: string) => Promise<any>;
    markJobPaused: (jobId: string, progressNote: string) => Promise<unknown>;
    markJobRunning: (jobId: string) => Promise<{ count: number } | unknown>;
    markJobSucceeded: (jobId: string) => Promise<{ count: number } | unknown>;
    markJobFailed: (jobId: string, errorMessage: string) => Promise<{ count: number } | unknown>;
    prisma: any;
  },
  input: {
    jobId: string;
    ownerKey: string;
    alreadyMarkedRunning?: boolean;
    acquireThrottle: () => { acquired: boolean; holder: unknown };
    releaseThrottle: (ownerKey: string) => void;
  },
) {
  const job = await deps.findJobById(input.jobId);
  if (!job) {
    throw new Error(`missing import job ${input.jobId}`);
  }
  if (job.status === "cancelled") {
    return { status: "cancelled" as const };
  }

  const throttle = input.acquireThrottle();
  if (!throttle.acquired) {
    const pauseResult = await deps.markJobPaused(
      input.jobId,
      "skipped by global throttle",
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
    const metadata = readBoardFullSyncMetadata(job.metadataJson);
    const importResult = await runByrSyncImport({
      prisma: deps.prisma,
      boardName: metadata.boardName,
      windowMinutes: metadata.fullSyncWindowMinutes,
      limit: null,
    });
    const succeededResult = await deps.markJobSucceeded(input.jobId);
    if (
      succeededResult &&
      typeof succeededResult === "object" &&
      "count" in succeededResult &&
      succeededResult.count === 0
    ) {
      return { status: "cancelled" as const };
    }
    return { status: "succeeded" as const, importResult };
  } catch (error) {
    const failedResult = await deps.markJobFailed(
      input.jobId,
      error instanceof Error ? error.message : "Unknown board full sync error",
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
  } finally {
    input.releaseThrottle(input.ownerKey);
  }
}
