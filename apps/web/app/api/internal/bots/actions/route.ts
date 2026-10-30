import { NextResponse } from "next/server";
import { prisma } from "@/src/server/db/client";
import { authorizedBotRequest } from "@/src/modules/mirroring/publishing/auth";
import { publishAtomicAction, PublicationError } from "@/src/modules/mirroring/publishing/service";
export async function POST(request: Request) {
  if (!authorizedBotRequest(request))
    return new NextResponse("Not Found", { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.actionId !== "string" || body.actionId.length > 100)
    return NextResponse.json({ error: "非法任务 ID" }, { status: 400 });
  try {
    return NextResponse.json(await publishAtomicAction(prisma, body.actionId));
  } catch (error) {
    console.error("机器人原子任务发布失败", {
      actionId: body.actionId,
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof PublicationError ? error.message : "数据库暂时无法完成发布，请稍后重试" },
      { status: 409 },
    );
  }
}
