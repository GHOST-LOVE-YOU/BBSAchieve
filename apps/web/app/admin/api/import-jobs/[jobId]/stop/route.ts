import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import { findJobById, markJobPaused } from "@/src/server/imports/importJobStore";

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

    if (job.status !== "running" && job.status !== "paused" && job.status !== "failed") {
      return NextResponse.json(
        { ok: false, error: `Job is not stoppable from ${job.status}` },
        { status: 409 },
      );
    }

    await markJobPaused(prisma, jobId);

    return NextResponse.json({ ok: true, jobId, status: "paused" });
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
