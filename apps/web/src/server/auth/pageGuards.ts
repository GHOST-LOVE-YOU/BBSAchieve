import { redirect } from "next/navigation";

import { prisma } from "@/src/server/db/client";

import { getKindeAdminOrgCode } from "./env";
import { ensureLocalHumanUser } from "./localUser";
import { getWebSessionIdentity } from "./webSession";

function loginUrl(returnTo: string) {
  const searchParams = new URLSearchParams({
    post_login_redirect_url: returnTo,
  });
  return `/api/auth/login?${searchParams.toString()}`;
}

export async function requireWebPageUser(returnTo: string) {
  const identity = await getWebSessionIdentity();
  if (!identity) {
    redirect(loginUrl(returnTo));
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
