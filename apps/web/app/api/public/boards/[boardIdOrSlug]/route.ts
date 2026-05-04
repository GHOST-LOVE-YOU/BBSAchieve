import { NextResponse } from "next/server";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardIdOrSlug: string }> },
) {
  try {
    const { boardIdOrSlug } = await context.params;
    const board = await createPublicReadingService().getBoard(boardIdOrSlug);

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
