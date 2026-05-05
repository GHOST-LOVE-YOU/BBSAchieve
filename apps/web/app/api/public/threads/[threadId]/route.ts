import { NextResponse } from "next/server";

import { requireRouteUser } from "@/src/server/auth/routeGuards";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export async function GET(
  request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  const auth = await requireRouteUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { threadId } = await context.params;
    const result = await createPublicReadingService().getThread(threadId);

    if (!result) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
