import { prisma } from "@/src/server/db/client";
import { runBoardBatchFullSyncJob } from "@/src/server/imports/boardBatchFullSyncRunner";
import {
  findJobById,
  markJobPaused,
  markJobFailed,
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
    void runBoardBatchFullSyncJob(
      {
        prisma,
        findJobById: (scheduledJobId) => findJobById(prisma, scheduledJobId),
        markJobPaused: (scheduledJobId, progressNote) =>
          markJobPaused(prisma, scheduledJobId, progressNote),
        markJobRunning: (scheduledJobId) => markJobRunning(prisma, scheduledJobId),
        updateJobProgress: (scheduledJobId, progress) =>
          updateJobProgress(prisma, scheduledJobId, progress),
        markJobSucceeded: (scheduledJobId) => markJobSucceeded(prisma, scheduledJobId),
        markJobFailed: (scheduledJobId, errorMessage) =>
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
    ).catch((error) => {
      console.error("scheduleBoardBatchFullSync background run failed", error);
    });
  }, 0);
}
