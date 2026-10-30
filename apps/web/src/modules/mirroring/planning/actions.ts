import { z } from "zod";
import { plainText } from "../source/content";
import { parseSourceTime } from "../source/time";
import type { ArticlePage } from "../source/types";
export const actionPayloadSchema = z.object({
  boardName: z.string().min(1).max(80),
  sourceThreadId: z.string().regex(/^\d+$/),
  sourcePostId: z.string().regex(/^\d+$/),
  kind: z.enum(["thread", "reply"]),
  title: z.string().max(2000),
  body: z.string().max(1_000_000),
  author: z.string().min(1).max(200),
  sourceFloor: z.number().int().nonnegative(),
  publishedAt: z.string().datetime(),
  quotedSourcePostIds: z.array(z.string().regex(/^\d+$/)).max(30).default([]),
});
export type AtomicAction = z.infer<typeof actionPayloadSchema>;
export function planActions(
  boardName: string,
  page: ArticlePage,
  observedAt: Date,
  start: Date,
  end: Date,
): AtomicAction[] {
  void start;
  void end;
  return page.articles.flatMap((post) => {
    const publishedAt = parseSourceTime(post.time, observedAt);
    // 主帖是回复的发布依赖，窗口外的主帖也需要被确保存在。
    const original = post.subject && post.id === page.gid;

    return [
      actionPayloadSchema.parse({
        boardName,
        sourceThreadId: page.gid,
        sourcePostId: post.id,
        kind: original ? "thread" : "reply",
        title: page.title,
        body: plainText(post.content),
        author: post.poster.id,
        sourceFloor: post.pos,
        publishedAt: publishedAt.toISOString(),
        quotedSourcePostIds:
          post.reid && post.reid !== page.gid && post.reid !== post.id
            ? [post.reid]
            : [],
      }),
    ];
  });
}
