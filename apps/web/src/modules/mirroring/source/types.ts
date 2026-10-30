import { z } from "zod";
const id = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine((v) => /^\d+$/.test(v), "非法源站 ID");
export const boardSchema = z.object({
  posts: z.array(
    z.object({
      gid: id,
      title: z.string(),
      replyTime: z.string(),
      replyCount: z.number().int().nonnegative(),
      tag: z.union([z.string(), z.boolean()]).optional(),
    }),
  ),
  pagination: z.object({
    current: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
export const articleSchema = z.object({
  gid: id,
  title: z.string(),
  anony: z.boolean().optional(),
  articles: z.array(
    z.object({
      id,
      pos: z.number().int().nonnegative(),
      time: z.string(),
      content: z.string(),
      subject: z.boolean(),
      poster: z.object({ id: z.string().min(1) }),
      reid: id.optional(),
    }),
  ),
  pagination: z.object({
    current: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});
export type BoardPage = z.infer<typeof boardSchema>;
export type ArticlePage = z.infer<typeof articleSchema>;
export type Observed<T> = { data: T; observedAt: Date };
export interface SourceClient {
  stats: { requests: number; cacheHits: number };
  board(name: string, page: number): Promise<Observed<BoardPage>>;
  article(
    name: string,
    id: string,
    page: number,
  ): Promise<Observed<ArticlePage>>;
}
export class SourceError extends Error {
  constructor(
    public code: "auth" | "missing" | "rate_limit" | "network" | "format",
    message: string,
  ) {
    super(message);
  }
}
