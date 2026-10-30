import type { PrismaClient } from "@prisma/client";
import { LEASE_MS } from "../config";
const NAME = "mirror-worker";
export async function acquireLease(db: PrismaClient, owner: string) {
  const rows = await db.$queryRaw<Array<{ owner: string }>>`
    INSERT INTO mirror_leases (name, owner, "expiresAt") VALUES (${NAME}, ${owner}, NOW() + INTERVAL '120 seconds')
    ON CONFLICT (name) DO UPDATE SET owner = EXCLUDED.owner, "expiresAt" = EXCLUDED."expiresAt"
    WHERE mirror_leases."expiresAt" < NOW()
    RETURNING owner`;
  return rows.length === 1;
}
export async function renewLease(db: PrismaClient, owner: string) {
  return (
    (
      await db.mirrorLease.updateMany({
        where: { name: NAME, owner, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date(Date.now() + LEASE_MS) },
      })
    ).count === 1
  );
}
export async function releaseLease(db: PrismaClient, owner: string) {
  await db.mirrorLease.deleteMany({ where: { name: NAME, owner } });
}
