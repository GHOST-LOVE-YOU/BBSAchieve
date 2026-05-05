import { NextResponse } from "next/server";

import {
  buildAdminImportsRedirectUrl,
  readRedirectTo,
} from "@/src/server/admin/adminImportsRedirect";
import { prisma } from "@/src/server/db/client";
import {
  findJobById,
  markJobRunning,
} from "@/src/server/imports/importJobStore";
import { scheduleBoardBatchFullSyncRun } from "@/src/server/imports/scheduleBoardBatchFullSync";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const redirectTo = await readRedirectTo(request);

  try {
    const { jobId } = await params;
    const job = await findJobById(prisma, jobId);

    if (!job) {
      if (redirectTo) {
        return new NextResponse(null, {
          status: 303,
          headers: {
            location: buildAdminImportsRedirectUrl(redirectTo, {
              action: "batch_resume",
              status: "failed",
              jobId,
              message: "Job not found",
            }),
          },
        });
      }
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    if (job.jobType !== "byr_board_full_sync_batch") {
      if (redirectTo) {
        return new NextResponse(null, {
          status: 303,
          headers: {
            location: buildAdminImportsRedirectUrl(redirectTo, {
              action: "batch_resume",
              status: "failed",
              jobId,
              message: "Only batch full sync jobs can be resumed",
            }),
          },
        });
      }
      return NextResponse.json(
        { ok: false, error: "Only batch full sync jobs can be resumed" },
        { status: 409 },
      );
    }

    if (job.status !== "paused" && job.status !== "failed") {
      if (redirectTo) {
        return new NextResponse(null, {
          status: 303,
          headers: {
            location: buildAdminImportsRedirectUrl(redirectTo, {
              action: "batch_resume",
              status: "failed",
              jobId,
              message: `Job is not resumable from ${job.status}`,
            }),
          },
        });
      }
      return NextResponse.json(
        { ok: false, error: `Job is not resumable from ${job.status}` },
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
      if (redirectTo) {
        return new NextResponse(null, {
          status: 303,
          headers: {
            location: buildAdminImportsRedirectUrl(redirectTo, {
              action: "batch_resume",
              status: "failed",
              jobId,
              message: "Job is no longer resumable",
            }),
          },
        });
      }
      return NextResponse.json(
        { ok: false, error: "Job is no longer resumable" },
        { status: 409 },
      );
    }

    scheduleBoardBatchFullSyncRun({
      jobId,
      alreadyMarkedRunning: true,
    });

    if (redirectTo) {
      return new NextResponse(null, {
        status: 303,
        headers: {
          location: buildAdminImportsRedirectUrl(redirectTo, {
            action: "batch_resume",
            status: "running",
            jobId,
          }),
        },
      });
    }

    return NextResponse.json({ ok: true, jobId });
  } catch (error) {
    if (redirectTo) {
      const { jobId } = await params;
      return new NextResponse(null, {
        status: 303,
        headers: {
          location: buildAdminImportsRedirectUrl(redirectTo, {
            action: "batch_resume",
            status: "failed",
            jobId,
            message: error instanceof Error ? error.message : "Unknown resume error",
          }),
        },
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown resume error",
      },
      { status: 500 },
    );
  }
}
