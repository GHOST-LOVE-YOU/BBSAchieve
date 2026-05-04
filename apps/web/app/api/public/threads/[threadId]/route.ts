import { NextResponse } from "next/server";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
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
