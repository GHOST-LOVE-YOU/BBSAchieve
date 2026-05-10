import { NextResponse } from "next/server";

import { requireRouteUser } from "@/src/server/auth/routeGuards";
import { prisma } from "@/src/server/db/client";
import {
  listBookmarks,
  toggleBookmark,
  isBookmarked,
} from "@/src/server/forum/bookmarkService";

async function resolveLocalUserId(authSubject: string, authProvider: string) {
  const profile = await prisma.humanProfile.findUnique({
    where: {
      authProvider_authSubject: { authProvider, authSubject },
    },
    select: { userId: true },
  });
  return profile?.userId ?? null;
}

export async function GET(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;

  try {
    const userId = await resolveLocalUserId(
      auth.identity.subject,
      auth.identity.provider,
    );
    if (!userId) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");

    if (threadId) {
      const bookmarked = await isBookmarked(userId, threadId);
      return NextResponse.json({ bookmarked });
    }

    const items = await listBookmarks(userId);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;

  let payload: { threadId?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.threadId || typeof payload.threadId !== "string") {
    return NextResponse.json(
      { error: "threadId is required" },
      { status: 400 },
    );
  }

  try {
    const userId = await resolveLocalUserId(
      auth.identity.subject,
      auth.identity.provider,
    );
    if (!userId) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const result = await toggleBookmark(userId, payload.threadId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
