import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import { runScheduledTask } from "@/src/server/scheduler/runScheduledTask";
import { getScheduledTask } from "@/src/server/scheduler/taskRegistry";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskKey: string }> },
) {
  try {
    const { taskKey } = await params;
    const task = getScheduledTask(taskKey);

    if (!task || !task.enabled) {
      return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
    }

    const run = await runScheduledTask({
      prisma,
      task,
      triggerSource: "manual",
    });

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
