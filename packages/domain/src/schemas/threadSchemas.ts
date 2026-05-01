import { z } from "zod";

export const createThreadInputSchema = z.object({
  boardId: z.string().min(1),
  authorUserId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});
