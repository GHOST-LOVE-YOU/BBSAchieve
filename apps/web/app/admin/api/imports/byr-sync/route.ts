import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/src/server/db/client";
import { fetchSyncOriginalPost } from "@/src/server/imports/fetchSyncOriginalPost";
import { fetchSyncThreadSnapshot } from "@/src/server/imports/fetchSyncThreadSnapshot";
import { fetchSyncUpdates } from "@/src/server/imports/fetchSyncUpdates";
import {
  importSyncBatch,
  type ImportSyncPrisma,
} from "@/src/server/imports/importSyncBatch";
import { mapSyncPayload } from "@/src/server/imports/mapSyncPayload";

export type ByrSyncImportPrisma = Pick<PrismaClient, "thread"> & ImportSyncPrisma;

function parseFloorIndex(floorLabel: string): number | null {
  const normalized = floorLabel.trim();
  if (normalized === "楼主" || normalized === "0楼") {
    return 0;
  }
  if (normalized === "沙发") {
    return 1;
  }
  if (normalized === "板凳") {
    return 2;
  }
  if (normalized === "地板") {
    return 3;
  }
  const match = normalized.match(/^(?:第)?(\d+)\s*楼$/);
  return match ? Number.parseInt(match[1] ?? "", 10) : null;
}

async function enrichThreadsWithSourceData(
  prismaClient: Pick<PrismaClient, "thread">,
  payload: Awaited<ReturnType<typeof fetchSyncUpdates>>,
) {
  const threads = await Promise.all(
    payload.threads.map(async (thread) => {
      const existingThread = await prismaClient.thread.findUnique({
        where: {
          sourceBoardSlug_sourceThreadId: {
            sourceBoardSlug: "iwhisper",
            sourceThreadId: thread.article_id,
          },
        },
        select: {
          id: true,
          body: true,
          replyCount: true,
        },
      });
      let posts = thread.posts;
      const persistedReplyCount = existingThread?.replyCount ?? 0;

      const seenFloors = posts
        .map((post) => parseFloorIndex(post.floor_label))
        .filter((value): value is number => value !== null && value > 0);
      const minSeenFloor = seenFloors.length > 0 ? Math.min(...seenFloors) : null;
      const expectedStartFloor = persistedReplyCount + 1;

      if (
        minSeenFloor !== null &&
        minSeenFloor > expectedStartFloor
      ) {
        const snapshot = await fetchSyncThreadSnapshot({
          boardName: payload.board_name,
          articleId: thread.article_id,
          startFloor: expectedStartFloor,
        });
        const snapshotReplyIds = new Set(snapshot.posts.map((post) => post.post_id));
        posts = [
          ...snapshot.posts,
          ...posts.filter((post) => !snapshotReplyIds.has(post.post_id)),
        ];
      }

      const hasOriginalPostInPosts = posts.some((post) => {
        const normalized = post.floor_label.trim();
        return normalized === "楼主" || normalized === "0楼";
      });
      const needsOriginalPost =
        !hasOriginalPostInPosts && (!existingThread || existingThread.body.trim().length === 0);

      if (!needsOriginalPost) {
        return {
          ...thread,
          posts,
        };
      }

      const originalPost = await fetchSyncOriginalPost({
        boardName: payload.board_name,
        articleId: thread.article_id,
      });
      const postIds = new Set(posts.map((post) => post.post_id));
      return {
        ...thread,
        posts: postIds.has(originalPost.post_id) ? posts : [originalPost, ...posts],
      };
    }),
  );

  return {
    ...payload,
    threads,
  };
}

export async function runByrSyncImport(input: {
  prisma: ByrSyncImportPrisma;
  boardName: string;
  windowMinutes: number;
}) {
  const payload = await fetchSyncUpdates({
    boardName: input.boardName,
    windowMinutes: input.windowMinutes,
  });
  const enrichedPayload = await enrichThreadsWithSourceData(input.prisma, payload);
  const batch = mapSyncPayload(enrichedPayload);
  return importSyncBatch(input.prisma, batch);
}

export async function POST() {
  try {
    const result = await runByrSyncImport({
      prisma,
      boardName: "IWhisper",
      windowMinutes: 30,
    });

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
