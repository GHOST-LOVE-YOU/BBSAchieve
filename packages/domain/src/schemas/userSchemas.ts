import { z } from "zod";

export const createBotUserInputSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().min(1),
  mailboxKey: z.string().min(1),
  sourceLabel: z.string().default("manual"),
  canPost: z.boolean().default(true),
});
