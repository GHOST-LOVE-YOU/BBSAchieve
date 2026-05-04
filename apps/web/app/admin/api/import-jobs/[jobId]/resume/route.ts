import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import { runBoardFullSyncJob } from "@/src/server/imports/boardFullSyncRunner";
import {
  findJobById,
  markJobFailed,
  markJobPaused,
  markJobRunning,
  markJobSucceeded,
  updateJobProgress,
} from "@/src/server/imports/importJobStore";
import { scheduleBoardFullSync } from "@/src/server/imports/scheduleBoardFullSync";
import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

function scheduleBoardFullSyncResume(jobId: string, boardName: string) {
  scheduleBoardFullSync(async () =>
    runBoardFullSyncJob(
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
      },
      {
        jobId,
        ownerKey: `manual:${boardName}`,
        alreadyMarkedRunning: true,
        acquireThrottle: () =>
          tryAcquireGlobalSyncThrottle({
            ownerKey: `manual:${boardName}`,
            triggerSource: "manual",
          }),
        releaseThrottle: releaseGlobalSyncThrottle,
      },
    ),
  );
}

function readBoardNameFromJob(job: { metadataJson?: unknown }) {
  const metadata =
    job.metadataJson && typeof job.metadataJson === "object"
      ? (job.metadataJson as Record<string, unknown>)
      : null;
  return typeof metadata?.boardName === "string" ? metadata.boardName : null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const job = await findJobById(prisma, jobId);

    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "paused" && job.status !== "failed") {
      return NextResponse.json(
        { ok: false, error: `Job is not resumable from ${job.status}` },
        { status: 409 },
      );
    }

    if (job.jobType !== "byr_board_full_sync") {
      return NextResponse.json(
        { ok: false, error: "Only board full sync jobs can be resumed" },
        { status: 409 },
      );
    }

    const boardName = readBoardNameFromJob(job);

    if (!boardName) {
      return NextResponse.json(
        { ok: false, error: "Board full sync job is missing boardName metadata" },
        { status: 500 },
      );
    }

    const runningResult = await markJobRunning(prisma, jobId);
    if (
      runningResult &&
      typeof runningResult === "object" &&
      "count" in runningResult &&
      runningResult.count === 0
    ) {
      return NextResponse.json(
        { ok: false, error: "Job is no longer resumable" },
        { status: 409 },
      );
    }
    scheduleBoardFullSyncResume(jobId, boardName);

    return NextResponse.json({ ok: true, jobId });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown resume error",
      },
      { status: 500 },
    );
  }
}
