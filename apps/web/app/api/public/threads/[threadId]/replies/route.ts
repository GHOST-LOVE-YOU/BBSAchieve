import { NextResponse } from "next/server";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

function parseLimit(url: URL) {
  const raw = url.searchParams.get("limit");
  return raw == null ? undefined : Number.parseInt(raw, 10);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await context.params;
    const url = new URL(request.url);
    const result = await createPublicReadingService().getThreadRepliesFeed({
      threadId,
      limit: parseLimit(url),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
