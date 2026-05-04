import { runByrSyncImport } from "@/app/admin/api/imports/byr-sync/route";

export async function runBoardFullSyncJob(
  deps: {
    findJobById: (jobId: string) => Promise<any>;
    markJobPaused: (jobId: string, progressNote: string) => Promise<unknown>;
    markJobRunning: (jobId: string) => Promise<unknown>;
    markJobSucceeded: (jobId: string) => Promise<unknown>;
    markJobFailed: (jobId: string, errorMessage: string) => Promise<unknown>;
    prisma: any;
  },
  input: {
    jobId: string;
    ownerKey: string;
    acquireThrottle: () => { acquired: boolean; holder: unknown };
    releaseThrottle: (ownerKey: string) => void;
  },
) {
  const job = await deps.findJobById(input.jobId);
  if (!job) {
    throw new Error(`missing import job ${input.jobId}`);
  }

  const throttle = input.acquireThrottle();
  if (!throttle.acquired) {
    await deps.markJobPaused(input.jobId, "skipped by global throttle");
    return { status: "paused" as const };
  }

  try {
    await deps.markJobRunning(input.jobId);
    const metadata = (job.metadataJson ?? {}) as {
      boardName: string;
      fullSyncWindowMinutes: number;
    };
    const importResult = await runByrSyncImport({
      prisma: deps.prisma,
      boardName: metadata.boardName,
      windowMinutes: metadata.fullSyncWindowMinutes,
    });
    await deps.markJobSucceeded(input.jobId);
    return { status: "succeeded" as const, importResult };
  } catch (error) {
    await deps.markJobFailed(
      input.jobId,
      error instanceof Error ? error.message : "Unknown board full sync error",
    );
    return { status: "failed" as const };
  } finally {
    input.releaseThrottle(input.ownerKey);
  }
}
