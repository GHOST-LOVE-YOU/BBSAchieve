import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schemaPath = resolve(__dirname, "../prisma/schema.prisma");

describe("Prisma notification subscription schema", () => {
  it("models subscriptions as content targets instead of bot bindings", () => {
    const schema = readFileSync(schemaPath, "utf8");

    expect(schema).toContain("enum SubscriptionTargetType");
    expect(schema).toContain("thread");
    expect(schema).toContain("reply");
    expect(schema).toContain("enum SubscriptionStatus");
    expect(schema).toContain("model ContentSubscription");
    expect(schema).toContain("targetType");
    expect(schema).toContain("threadId");
    expect(schema).toContain("replyId");

    expect(schema).not.toContain("model UserBotBinding");
    expect(schema).not.toContain("user_bot_bindings");
    expect(schema).not.toContain("BindingStatus");
  });
});
