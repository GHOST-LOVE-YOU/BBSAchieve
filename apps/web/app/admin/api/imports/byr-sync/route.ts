import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import { fetchSyncUpdates } from "@/src/server/imports/fetchSyncUpdates";
import { importSyncBatch } from "@/src/server/imports/importSyncBatch";
import { mapSyncPayload } from "@/src/server/imports/mapSyncPayload";

export async function POST() {
  try {
    const payload = await fetchSyncUpdates();
    const batch = mapSyncPayload(payload);
    const result = await importSyncBatch(prisma, batch);

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown sync import error",
      },
      { status: 500 },
    );
  }
}
