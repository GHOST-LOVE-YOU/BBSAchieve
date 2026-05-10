import { NextResponse } from "next/server";

import { requireRouteUser } from "@/src/server/auth/routeGuards";
import { prisma } from "@/src/server/db/client";
import {
  deleteSubscription,
  SubscriptionValidationError,
} from "@/src/server/forum/subscriptionsService";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ subscriptionId: string }> },
) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { subscriptionId } = await context.params;
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
    await deleteSubscription({
      humanUserId: profile.userId,
      subscriptionId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SubscriptionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
