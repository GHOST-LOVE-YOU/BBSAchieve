import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
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

function scheduleLegacyMigration(jobId: string) {
  setTimeout(() => {
    try {
      void Promise.resolve(
        runLegacyMigrationJob(
          {
            findJobById,
            markJobRunning,
            markJobPaused,
            updateJobProgress,
            markJobFailed,
            markJobSucceeded,
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
