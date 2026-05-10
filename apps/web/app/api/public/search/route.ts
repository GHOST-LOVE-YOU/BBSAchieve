import { NextResponse } from "next/server";

import { searchForum, type SearchScope } from "@/src/server/forum/searchService";

function parseScope(raw: string | null): SearchScope | "all" {
  if (raw === "posts" || raw === "replies" || raw === "users" || raw === "all") {
    return raw;
  }
  return "all";
}

function parseLimit(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new Error("Invalid limit");
  }
  return Number.parseInt(raw, 10);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const scope = parseScope(url.searchParams.get("scope"));
    const limit = parseLimit(url.searchParams.get("limit"));
    const results = await searchForum({ query, scope, limit });
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.startsWith("Invalid") ? 400 : 500 },
    );
  }
}
