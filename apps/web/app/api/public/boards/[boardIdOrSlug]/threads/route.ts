import { NextResponse } from "next/server";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

function parseLimit(url: URL) {
  const raw = url.searchParams.get("limit");
  if (raw == null) {
    return undefined;
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error("Invalid limit");
  }
  return Number.parseInt(raw, 10);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ boardIdOrSlug: string }> },
) {
  try {
    const { boardIdOrSlug } = await context.params;
    const url = new URL(request.url);
    const result = await createPublicReadingService().getBoardThreadsFeed({
      boardIdOrSlug,
      limit: parseLimit(url),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
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
