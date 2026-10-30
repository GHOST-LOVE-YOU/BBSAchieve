import { notFound, redirect } from "next/navigation";

import { prisma } from "@/src/server/db/client";

import { getKindeAdminOrgCode } from "./env";
import { ensureLocalHumanUser } from "./localUser";
import { getWebSessionIdentity } from "./webSession";

export async function requireWebPageUser(_returnTo: string) {
  void _returnTo;
  const identity = await getWebSessionIdentity().catch(() => null);
  if (!identity) {
    notFound();
  }

  await ensureLocalHumanUser(prisma, identity);
  return identity;
}

export async function requireAdminPageUser(returnTo = "/admin") {
  const identity = await requireWebPageUser(returnTo);
  const adminOrgCode = getKindeAdminOrgCode();

  if (!identity.orgCodes.includes(adminOrgCode)) {
    redirect("/");
  }

  return identity;
}
