import { NextResponse } from "next/server";

import { buildAdminImportsRedirectUrl } from "@/src/server/admin/adminImportsRedirect";
import { requireAdminRouteUser } from "@/src/server/auth/routeGuards";
import { boardSyncBoards } from "@/src/server/boardSync/boardRegistry";
import { prisma } from "@/src/server/db/client";
import { createBoardBatchFullSyncJob } from "@/src/server/imports/importJobStore";
import { scheduleBoardBatchFullSync } from "@/src/server/imports/scheduleBoardBatchFullSync";

export async function POST(request: Request) {
  const auth = await requireAdminRouteUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData();
  const redirectToValue = formData.get("redirectTo");
  const redirectTo =
    typeof redirectToValue === "string" && redirectToValue.startsWith("/")
      ? redirectToValue
      : null;
  const selectedBoardNames = formData
    .getAll("boardNames")
    .map((value) => String(value))
    .filter((value) => value.trim().length > 0);

  if (selectedBoardNames.length === 0) {
    if (redirectTo) {
      return new NextResponse(null, {
        status: 303,
        headers: {
          location: buildAdminImportsRedirectUrl(redirectTo, {
            action: "batch_start",
            status: "failed",
            message: "At least one board must be selected",
          }),
        },
      });
    }
    return NextResponse.json({ ok: false, error: "At least one board must be selected" }, { status: 400 });
  }

  const fullSyncBoards = boardSyncBoards.filter((board) => board.fullSyncEnabled);
  const knownBoardNames = new Set(boardSyncBoards.map((board) => board.boardName));
  const enabledBoardNames = new Set(fullSyncBoards.map((board) => board.boardName));

  if (selectedBoardNames.some((name) => !knownBoardNames.has(name))) {
    if (redirectTo) {
      return new NextResponse(null, {
        status: 303,
        headers: {
          location: buildAdminImportsRedirectUrl(redirectTo, {
            action: "batch_start",
            status: "failed",
            message: "Unknown board selection",
          }),
        },
      });
    }
    return NextResponse.json({ ok: false, error: "Unknown board selection" }, { status: 400 });
  }
  if (selectedBoardNames.some((name) => !enabledBoardNames.has(name))) {
    if (redirectTo) {
      return new NextResponse(null, {
        status: 303,
        headers: {
          location: buildAdminImportsRedirectUrl(redirectTo, {
            action: "batch_start",
            status: "failed",
            message: "Board is not enabled for full sync",
          }),
        },
      });
    }
    return NextResponse.json(
      { ok: false, error: "Board is not enabled for full sync" },
      { status: 400 },
    );
  }

  const orderedBoardNames = fullSyncBoards
    .map((board) => board.boardName)
    .filter((name) => selectedBoardNames.includes(name));

  const job = await createBoardBatchFullSyncJob(prisma, {
    selectedBoardNames,
    orderedBoardNames,
  });

  scheduleBoardBatchFullSync(job.id);

  if (redirectTo) {
    return new NextResponse(null, {
      status: 303,
      headers: {
        location: buildAdminImportsRedirectUrl(redirectTo, {
          action: "batch_start",
          status: "queued",
          jobId: job.id,
        }),
      },
    });
  }

  return NextResponse.json({ ok: true, jobId: job.id });
}
