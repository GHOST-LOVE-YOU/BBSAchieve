import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import {
  findJobById,
  markJobCancelled,
} from "@/src/server/imports/importJobStore";

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

    if (!["pending", "running", "paused", "failed"].includes(job.status)) {
      return NextResponse.json(
        { ok: false, error: `Job is not stoppable from ${job.status}` },
        { status: 409 },
      );
    }

    if (job.jobType !== "byr_board_full_sync") {
      return NextResponse.json(
        { ok: false, error: "Only board full sync jobs can be stopped" },
        { status: 409 },
      );
    }

    await markJobCancelled(prisma, jobId);
    return NextResponse.json({ ok: true, jobId, status: "cancelled" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown stop error",
      },
      { status: 500 },
    );
  }
}
