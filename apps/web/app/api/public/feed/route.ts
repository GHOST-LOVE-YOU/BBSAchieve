import { NextResponse } from "next/server";

import { listFeed, type FeedKind } from "@/src/server/forum/feedService";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new Error("Invalid integer parameter");
  }
  return Number.parseInt(value, 10);
}

function parseKind(raw: string | null): FeedKind {
  if (raw === "bot" || raw === "real" || raw === "all") {
    return raw;
  }
  return "all";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = parseKind(url.searchParams.get("kind"));
    const sortBy = url.searchParams.get("sort");
    const result = await listFeed({
      kind,
      page: parsePositiveInt(url.searchParams.get("page"), 1),
      perPage: parsePositiveInt(url.searchParams.get("perPage"), 15),
      sortBy: sortBy === "published" ? "published" : "lastReply",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.startsWith("Invalid") ? 400 : 500 },
    );
  }
}
