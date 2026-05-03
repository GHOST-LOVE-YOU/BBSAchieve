import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import { runScheduledTask } from "@/src/server/scheduler/runScheduledTask";
import { getScheduledTask } from "@/src/server/scheduler/taskRegistry";

async function readRedirectTo(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    !contentType.includes("application/x-www-form-urlencoded") &&
    !contentType.includes("multipart/form-data")
  ) {
    return null;
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirectTo");

  if (typeof redirectTo !== "string" || redirectTo.length === 0) {
    return null;
  }

  return redirectTo.startsWith("/") ? redirectTo : null;
}

function buildRedirectUrl(
  redirectTo: string,
  input: {
    taskKey: string;
    status: string;
    errorMessage?: string | null;
  },
) {
  const url = new URL(redirectTo, "http://localhost");
  url.searchParams.set("runTaskKey", input.taskKey);
  url.searchParams.set("runStatus", input.status);
  if (input.errorMessage) {
    url.searchParams.set("runMessage", input.errorMessage);
  }
  return `${url.pathname}${url.search}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskKey: string }> },
) {
  try {
    const { taskKey } = await params;
    const task = getScheduledTask(taskKey);
    const redirectTo = await readRedirectTo(request);

    if (!task || !task.enabled) {
      return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
    }

    const run = await runScheduledTask({
      prisma,
      task,
      triggerSource: "manual",
    });

    if (redirectTo) {
      return new NextResponse(null, {
        status: 303,
        headers: {
          location: buildRedirectUrl(redirectTo, {
          taskKey,
          status: run.status,
          errorMessage: run.status === "failed" ? run.errorMessage : null,
          }),
        },
      });
    }

    if (run.status === "failed") {
      return NextResponse.json(
        {
          ok: false,
          error: run.errorMessage ?? "Unknown scheduled task error",
          run,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown scheduled task error",
      },
      { status: 500 },
    );
  }
}
