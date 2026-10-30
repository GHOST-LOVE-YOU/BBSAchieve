import type { PrismaClient } from "@prisma/client";
export async function dispatchActions(
  db: PrismaClient,
  ensureLease: () => Promise<void>,
  transport: typeof fetch = fetch,
  limit = 30,
) {
  const token = process.env.BOT_PUBLISH_TOKEN;
  if (!token || token.length < 32) throw new Error("未配置机器人发布密钥");
  const base =
    process.env.BOT_PUBLISH_BASE_URL ??
    `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
  const parsed = new URL(base);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(parsed.hostname))
    throw new Error("机器人发布接口必须使用本机地址");
  const ids = await db.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM mirror_actions WHERE status IN ('pending','retrying') AND "nextAttemptAt" <= NOW() AND "boardName" NOT IN (SELECT "boardName" FROM mirror_board_states WHERE paused=true) ORDER BY "boardName", "sourceThreadId", (payload->>'sourceFloor')::int, "createdAt" LIMIT ${limit}`;
  const records = await db.mirrorAction.findMany({
    where: { id: { in: ids.map((x) => x.id) } },
  });
  const actions = ids.map((x) => records.find((a) => a.id === x.id)!);
  for (const action of actions) {
    await ensureLease();
    let failure = "发布接口连接失败或响应丢失，将按退避策略重试";
    try {
      const response = await transport(
        `${base.replace(/\/$/, "")}/api/internal/bots/actions`,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(20_000),
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ actionId: action.id }),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        failure =
          typeof data?.error === "string"
            ? data.error.slice(0, 300)
            : `发布接口返回 HTTP ${response.status}`;
        throw new Error("发布失败");
      }
      await response.body?.cancel();
      // 成功回执由 API 在事务内写入。网络成功本身不推进发布状态。
    } catch {
      const attempts = action.attempts + 1;
      await db.mirrorAction.updateMany({
        where: { id: action.id, status: { not: "published" } },
        data: {
          attempts,
          status: attempts >= 5 ? "failed" : "retrying",
          nextAttemptAt: new Date(
            Date.now() + Math.min(1800, 15 * 2 ** attempts) * 1000,
          ),
          errorMessage: failure,
        },
      });
    }
  }
}
