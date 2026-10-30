import { NextResponse } from "next/server";
import {
  searchForum,
  type SearchScope,
} from "@/src/server/forum/searchService";
function scope(raw: string | null): SearchScope | "all" {
  return raw === "posts" ||
    raw === "replies" ||
    raw === "users" ||
    raw === "all"
    ? raw
    : "all";
}
function integer(raw: string | null, name: string, fallback: number) {
  if (raw == null) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${name}`);
  return Number.parseInt(raw, 10);
}
export async function GET(request: Request) {
  try {
    const u = new URL(request.url);
    const results = await searchForum({
      query: u.searchParams.get("q") ?? "",
      scope: scope(u.searchParams.get("scope")),
      page: integer(u.searchParams.get("page"), "page", 1),
      perPage: integer(u.searchParams.get("limit"), "limit", 25),
    });
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      {
        status:
          error instanceof Error && error.message.startsWith("Invalid")
            ? 400
            : 500,
      },
    );
  }
}
