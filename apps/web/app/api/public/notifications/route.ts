import { NextResponse } from "next/server";

import { requireRouteUser } from "@/src/server/auth/routeGuards";
import { prisma } from "@/src/server/db/client";
import {
  listNotifications,
  type NotificationFilter,
} from "@/src/server/forum/notificationsService";

function parseFilter(raw: string | null): NotificationFilter {
  if (!raw || raw === "all" || raw === "unread") {
    return raw === "unread" ? "unread" : "all";
  }
  if (
    raw === "thread_reply" ||
    raw === "reply_quote" ||
    raw === "mirror_source_stale" ||
    raw === "bot_rotated" ||
    raw === "system"
  ) {
    return raw;
  }
  return "all";
}

export async function GET(request: Request) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const profile = await prisma.humanProfile.findUnique({
      where: {
        authProvider_authSubject: {
          authProvider: auth.identity.provider,
          authSubject: auth.identity.subject,
        },
      },
      select: { userId: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    const result = await listNotifications({
      recipientUserId: profile.userId,
      filter: parseFilter(url.searchParams.get("filter")),
      page: Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
      perPage: Number.parseInt(url.searchParams.get("perPage") ?? "20", 10) || 20,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
