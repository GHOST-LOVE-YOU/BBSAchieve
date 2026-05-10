import { NextResponse } from "next/server";

import { listUserThreads } from "@/src/server/forum/userProfileService";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new Error("Invalid integer parameter");
  }
  return Number.parseInt(value, 10);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;
    const url = new URL(request.url);
    const result = await listUserThreads({
      userId,
      page: parsePositiveInt(url.searchParams.get("page"), 1),
      perPage: parsePositiveInt(url.searchParams.get("perPage"), 8),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof Error && error.message.startsWith("Invalid") ? 400 : 500 },
    );
  }
}
