import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true);
async function main() {
  const { prisma } = await import("@/src/server/db/client");
  try {
    if (process.argv[2] === "tick") {
      const { runMirrorTick } = await import("../scheduling/worker");
      console.log(await runMirrorTick());
    } else if (process.argv[2] === "probe") {
      const { ByrMobileClient } = await import("../source/client");
      const client = new ByrMobileClient({
        username: process.env.BBS_USERNAME ?? "",
        password: process.env.BBS_PASSWORD ?? "",
      });
      const board = await client.board("IWhisper", 1);
      const thread = board.data.posts.find((p) => p.tag !== "top");
      console.log({ boardRecords: board.data.posts.length });
      if (thread) {
        const page = await client.article("IWhisper", thread.gid, 1);
        console.log({
          articles: page.data.articles.length,
          pages: page.data.pagination.total,
          requests: client.stats.requests,
        });
      }
    } else throw new Error("使用 tick 或 probe");
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : "执行失败");
  process.exitCode = 1;
});
