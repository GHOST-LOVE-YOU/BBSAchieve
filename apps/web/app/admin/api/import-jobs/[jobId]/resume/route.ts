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
import { fetchLegacyIwhisperBatch } from "@/src/server/imports/fetchLegacyIwhisperBatch";
import { runLegacyMigrationJob } from "@/src/server/imports/legacyMigrationRunner";
import { importSyncBatch } from "@/src/server/imports/importSyncBatch";
import { mapLegacyRows } from "@/src/server/imports/mapLegacyRows";
import { scheduleBoardFullSync } from "@/src/server/imports/scheduleBoardFullSync";
import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

function scheduleLegacyMigration(jobId: string) {
  setTimeout(() => {
    try {
      void Promise.resolve(
        runLegacyMigrationJob(
          {
            findJobById: (scheduledJobId) => findJobById(prisma, scheduledJobId),
            markJobRunning: (scheduledJobId, cursorThreadKey) =>
              markJobRunning(prisma, scheduledJobId, cursorThreadKey),
            markJobPaused: (scheduledJobId) => markJobPaused(prisma, scheduledJobId),
            updateJobProgress: (scheduledJobId, progress) =>
              updateJobProgress(prisma, scheduledJobId, progress),
            markJobFailed: (scheduledJobId, errorMessage) =>
              markJobFailed(prisma, scheduledJobId, errorMessage),
            markJobSucceeded: (scheduledJobId) =>
              markJobSucceeded(prisma, scheduledJobId),
            fetchBatch: (options) => fetchLegacyIwhisperBatch(options),
            importBatch: (batch) => importSyncBatch(prisma, batch),
            mapRows: mapLegacyRows,
            batchSize: 50,
          },
          jobId,
        ),
      ).catch(() => {
        // Background runner failures are persisted through job state.
      });
    } catch {
      // Background runner setup failures are surfaced only through tests/logs.
    }
  }, 0);
}

function scheduleBoardFullSyncResume(jobId: string, boardName: string) {
  scheduleBoardFullSync(async () =>
    runBoardFullSyncJob(
      {
        prisma,
        findJobById: (scheduledJobId) => findJobById(prisma, scheduledJobId),
        markJobPaused: (scheduledJobId, progressNote) =>
          markJobPaused(prisma, scheduledJobId, progressNote),
        markJobRunning: (scheduledJobId) => markJobRunning(prisma, scheduledJobId),
        markJobSucceeded: (scheduledJobId) => markJobSucceeded(prisma, scheduledJobId),
        markJobFailed: (scheduledJobId, errorMessage) =>
          markJobFailed(prisma, scheduledJobId, errorMessage),
      },
      {
        jobId,
        ownerKey: `manual:${boardName}`,
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

    if (job.jobType === "byr_board_full_sync") {
      const boardName = readBoardNameFromJob(job);

      if (!boardName) {
        return NextResponse.json(
          { ok: false, error: "Board full sync job is missing boardName metadata" },
          { status: 500 },
        );
      }

      await markJobRunning(prisma, jobId);
      scheduleBoardFullSyncResume(jobId, boardName);
      return NextResponse.json({ ok: true, jobId });
    }

    await markJobRunning(prisma, jobId, job.cursorThreadKey);
    scheduleLegacyMigration(jobId);

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
