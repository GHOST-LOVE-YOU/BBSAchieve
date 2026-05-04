import { prisma } from "@/src/server/db/client";
import { runBoardBatchFullSyncJob } from "@/src/server/imports/boardBatchFullSyncRunner";
import {
  findJobById,
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
  setTimeout(() => {
    void runBoardBatchFullSyncJob(
      {
        prisma,
        findJobById: (scheduledJobId) => findJobById(prisma, scheduledJobId),
        markJobRunning: (scheduledJobId) => markJobRunning(prisma, scheduledJobId),
        updateJobProgress: (scheduledJobId, progress) =>
          updateJobProgress(prisma, scheduledJobId, progress),
        markJobSucceeded: (scheduledJobId) => markJobSucceeded(prisma, scheduledJobId),
        markJobFailed: (scheduledJobId, errorMessage) =>
          markJobFailed(prisma, scheduledJobId, errorMessage),
      } as never,
      {
        jobId,
        acquireThrottle: () =>
          tryAcquireGlobalSyncThrottle({
            ownerKey: `manual:${jobId}`,
            triggerSource: "manual",
          }),
        releaseThrottle: () => releaseGlobalSyncThrottle(`manual:${jobId}`),
      },
    ).catch((error) => {
      console.error("scheduleBoardBatchFullSync background run failed", error);
    });
  }, 0);
}
