import { NextResponse } from "next/server";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export async function GET() {
  try {
    return NextResponse.json(await createPublicReadingService().listBoards());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
