import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const file = resolve(".env.local");
  const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
  const existing = new Map(
    lines
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
  const url =
    existing.get("DATABASE_URL") ??
    "postgresql://postgres:postgres@127.0.0.1:5433/bbsachieve";
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error("开发初始化仅允许本机数据库");
  const values = {
    DATABASE_URL: url,
    LOCAL_DEV_AUTH: "true",
    MIRROR_SOURCE: "fixture",
    MIRROR_ENABLED: "false",
    BOT_PUBLISH_BASE_URL: "http://127.0.0.1:3307",
    BOT_PUBLISH_TOKEN:
      existing.get("BOT_PUBLISH_TOKEN") ?? randomBytes(32).toString("hex"),
  };
  for (const [k, v] of Object.entries(values)) existing.set(k, v);
  writeFileSync(
    file,
    [
      "# 本机开发专用；禁止提交。",
      ...Array.from(existing, ([k, v]) => `${k}=${v}`),
    ].join("\n") + "\n",
    { mode: 0o600 },
  );
  chmodSync(file, 0o600);
  const env = { ...process.env, DATABASE_URL: url };
  const migration = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env,
    stdio: "inherit",
  });
  if (migration.status !== 0) throw new Error("本机数据库迁移失败");
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    await db.user.upsert({
      where: { id: "local-dev-admin" },
      create: {
        id: "local-dev-admin",
        username: "local-admin",
        displayName: "本地管理员",
        userType: "human",
        status: "active",
        humanProfile: {
          create: {
            authProvider: "kinde",
            authSubject: "local-dev-admin",
            profileStatus: "active",
          },
        },
      },
      update: {},
    });
    console.log(
      "本机数据库已就绪。运行 pnpm dev:local，然后访问 http://127.0.0.1:3307/admin/scheduled-tasks。模拟源站不会请求真实论坛。",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "初始化失败");
  process.exitCode = 1;
});
