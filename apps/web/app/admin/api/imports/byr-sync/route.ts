import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import { fetchSyncBackfill } from "@/src/server/imports/fetchSyncBackfill";
import { fetchSyncUpdates } from "@/src/server/imports/fetchSyncUpdates";
import { importSyncBatch } from "@/src/server/imports/importSyncBatch";
import { mapSyncPayload } from "@/src/server/imports/mapSyncPayload";

async function enrichThreadsWithBackfill(payload: Awaited<ReturnType<typeof fetchSyncUpdates>>) {
  const threads = await Promise.all(
    payload.threads.map(async (thread) => {
      if (thread.posts.length > 0) {
        return thread;
      }

      const backfill = await fetchSyncBackfill({
        boardName: payload.board_name,
        articleId: thread.article_id,
        startFloor: 1,
      });

      return {
        ...thread,
        posts: backfill.posts,
      };
    }),
  );

  return {
    ...payload,
    threads,
  };
}

export async function POST() {
  try {
    const payload = await fetchSyncUpdates();
    const enrichedPayload = await enrichThreadsWithBackfill(payload);
    const batch = mapSyncPayload(enrichedPayload);
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
