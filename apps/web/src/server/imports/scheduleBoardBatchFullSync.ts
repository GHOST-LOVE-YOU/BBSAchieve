import { prisma } from "@/src/server/db/client";
import { runBoardBatchFullSyncJob } from "@/src/server/imports/boardBatchFullSyncRunner";
import {
  findJobById,
  markJobPaused,
  markJobFailed,
  markJobFailedBeforeOrDuringRun,
  markJobRunning,
  markJobSucceeded,
  updateJobProgress,
} from "@/src/server/imports/importJobStore";
import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

export function scheduleBoardBatchFullSync(jobId: string) {
  scheduleBoardBatchFullSyncRun({ jobId });
}

export function scheduleBoardBatchFullSyncRun(input: {
  jobId: string;
  alreadyMarkedRunning?: boolean;
}) {
  setTimeout(() => {
    const failUnexpectedRun = async (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown batch full sync error";
      await markJobFailedBeforeOrDuringRun(prisma, input.jobId, errorMessage);
      console.error("scheduleBoardBatchFullSync background run failed", error);
    };

    void runBoardBatchFullSyncJob(
      {
        prisma,
        findJobById: (scheduledJobId: string) => findJobById(prisma, scheduledJobId),
        markJobPaused: (scheduledJobId: string, progressNote: string | null | undefined) =>
          markJobPaused(prisma, scheduledJobId, progressNote),
        markJobRunning: (scheduledJobId: string) => markJobRunning(prisma, scheduledJobId),
        updateJobProgress: (
          scheduledJobId: string,
          progress: Parameters<typeof updateJobProgress>[2],
        ) =>
          updateJobProgress(prisma, scheduledJobId, progress),
        markJobSucceeded: (scheduledJobId: string) => markJobSucceeded(prisma, scheduledJobId),
        markJobFailed: (scheduledJobId: string, errorMessage: string) =>
          markJobFailed(prisma, scheduledJobId, errorMessage),
      } as never,
      {
        jobId: input.jobId,
        alreadyMarkedRunning: input.alreadyMarkedRunning,
        acquireThrottle: () =>
          tryAcquireGlobalSyncThrottle({
            ownerKey: `manual:${input.jobId}`,
            triggerSource: "manual",
          }),
        releaseThrottle: () => releaseGlobalSyncThrottle(`manual:${input.jobId}`),
      },
    ).catch(failUnexpectedRun);
  }, 0);
}
