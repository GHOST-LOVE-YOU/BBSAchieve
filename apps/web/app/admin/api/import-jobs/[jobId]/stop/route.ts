import { NextResponse } from "next/server";

import {
  buildAdminImportsRedirectUrl,
  readRedirectTo,
} from "@/src/server/admin/adminImportsRedirect";
import { prisma } from "@/src/server/db/client";
import {
  findJobById,
  markJobCancelled,
} from "@/src/server/imports/importJobStore";

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
              action: "batch_stop",
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
              action: "batch_stop",
              status: "failed",
              jobId,
              message: "Only batch full sync jobs can be stopped",
            }),
          },
        });
      }
      return NextResponse.json(
        { ok: false, error: "Only batch full sync jobs can be stopped" },
        { status: 409 },
      );
    }

    if (!["pending", "running", "paused", "failed"].includes(job.status)) {
      if (redirectTo) {
        return new NextResponse(null, {
          status: 303,
          headers: {
            location: buildAdminImportsRedirectUrl(redirectTo, {
              action: "batch_stop",
              status: "failed",
              jobId,
              message: `Job is not stoppable from ${job.status}`,
            }),
          },
        });
      }
      return NextResponse.json(
        { ok: false, error: `Job is not stoppable from ${job.status}` },
        { status: 409 },
      );
    }

    const cancelResult = await markJobCancelled(prisma, jobId);
    if (
      cancelResult &&
      typeof cancelResult === "object" &&
      "count" in cancelResult &&
      cancelResult.count === 0
    ) {
      if (redirectTo) {
        return new NextResponse(null, {
          status: 303,
          headers: {
            location: buildAdminImportsRedirectUrl(redirectTo, {
              action: "batch_stop",
              status: "failed",
              jobId,
              message: "Job is no longer stoppable",
            }),
          },
        });
      }
      return NextResponse.json(
        { ok: false, error: "Job is no longer stoppable" },
        { status: 409 },
      );
    }
    if (redirectTo) {
      return new NextResponse(null, {
        status: 303,
        headers: {
          location: buildAdminImportsRedirectUrl(redirectTo, {
            action: "batch_stop",
            status: "cancelled",
            jobId,
          }),
        },
      });
    }
    return NextResponse.json({ ok: true, jobId, status: "cancelled" });
  } catch (error) {
    if (redirectTo) {
      const { jobId } = await params;
      return new NextResponse(null, {
        status: 303,
        headers: {
          location: buildAdminImportsRedirectUrl(redirectTo, {
            action: "batch_stop",
            status: "failed",
            jobId,
            message: error instanceof Error ? error.message : "Unknown stop error",
          }),
        },
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown stop error",
      },
      { status: 500 },
    );
  }
}
