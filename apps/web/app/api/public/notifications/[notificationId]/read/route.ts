import { NextResponse } from "next/server";

import { requireRouteUser } from "@/src/server/auth/routeGuards";
import { prisma } from "@/src/server/db/client";
import { markNotificationRead } from "@/src/server/forum/notificationsService";

export async function POST(
  request: Request,
  context: { params: Promise<{ notificationId: string }> },
) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { notificationId } = await context.params;
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
    await markNotificationRead({
      recipientUserId: profile.userId,
      notificationId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
