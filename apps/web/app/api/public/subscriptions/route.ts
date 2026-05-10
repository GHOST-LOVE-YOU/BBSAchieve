import { NextResponse } from "next/server";

import { requireRouteUser } from "@/src/server/auth/routeGuards";
import { prisma } from "@/src/server/db/client";
import {
  createSubscription,
  listSubscriptions,
  SubscriptionValidationError,
} from "@/src/server/forum/subscriptionsService";

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

  const url = new URL(request.url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
  const perPage = Number.parseInt(url.searchParams.get("perPage") ?? "20", 10) || 20;

  try {
    const userId = await resolveLocalUserId(
      auth.identity.subject,
      auth.identity.provider,
    );
    if (!userId) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    const result = await listSubscriptions({
      humanUserId: userId,
      page,
      perPage,
    });
    return NextResponse.json(result);
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

  let payload: { targetType?: string; threadId?: string; replyId?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (payload.targetType !== "thread" && payload.targetType !== "reply") {
    return NextResponse.json(
      { error: "targetType must be 'thread' or 'reply'" },
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
    const subscription = await createSubscription({
      humanUserId: userId,
      targetType: payload.targetType,
      threadId: payload.threadId,
      replyId: payload.replyId,
    });
    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    if (error instanceof SubscriptionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
