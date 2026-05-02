import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import {
  createLegacyImportJob,
  findJobById,
  markJobFailed,
  markJobRunning,
  updateJobProgress,
  markJobSucceeded,
} from "@/src/server/imports/importJobStore";
import { fetchLegacyIwhisperBatch } from "@/src/server/imports/fetchLegacyIwhisperBatch";
import { runLegacyMigrationJob } from "@/src/server/imports/legacyMigrationRunner";
import { mapLegacyRows } from "@/src/server/imports/mapLegacyRows";
import { importSyncBatch } from "@/src/server/imports/importSyncBatch";

function scheduleLegacyMigration(jobId: string) {
  setTimeout(() => {
    try {
      void Promise.resolve(
        runLegacyMigrationJob(
          {
            findJobById: (scheduledJobId) => findJobById(prisma, scheduledJobId),
            markJobRunning: (scheduledJobId, cursorThreadKey) =>
              markJobRunning(prisma, scheduledJobId, cursorThreadKey),
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

export async function POST() {
  try {
    const job = await createLegacyImportJob(prisma);
    scheduleLegacyMigration(job.id);

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown import job error",
      },
      { status: 500 },
    );
  }
}
