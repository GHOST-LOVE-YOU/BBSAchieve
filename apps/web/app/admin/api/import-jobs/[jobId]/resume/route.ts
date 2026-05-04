import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import {
  findJobById,
  markJobRunning,
} from "@/src/server/imports/importJobStore";
import { scheduleBoardBatchFullSyncRun } from "@/src/server/imports/scheduleBoardBatchFullSync";

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

    if (job.jobType !== "byr_board_full_sync_batch") {
      return NextResponse.json(
        { ok: false, error: "Only batch full sync jobs can be resumed" },
        { status: 409 },
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

    scheduleBoardBatchFullSyncRun({
      jobId,
      alreadyMarkedRunning: true,
    });

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
