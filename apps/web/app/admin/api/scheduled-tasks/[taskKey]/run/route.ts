import { NextResponse } from "next/server";
import { requireAdminRouteUser } from "@/src/server/auth/routeGuards";
import { prisma } from "@/src/server/db/client";
import { mirrorBoards } from "@/src/modules/mirroring/config";
import { queueBoard } from "@/src/modules/mirroring/scheduling/control";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskKey: string }> },
) {
  const auth = await requireAdminRouteUser(request);
  if (!auth.ok) return auth.response;
  const { taskKey } = await params;
  const board = mirrorBoards.find((b) => `${b.slug}_recent_sync` === taskKey);
  if (!board)
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  const run = await queueBoard(prisma, board.name, "manual");
  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  )
    return new NextResponse(null, {
      status: 303,
      headers: { location: "/admin/scheduled-tasks" },
    });
  return NextResponse.json(
    { ok: true, status: "queued", runId: run?.id },
    { status: 202 },
  );
}
