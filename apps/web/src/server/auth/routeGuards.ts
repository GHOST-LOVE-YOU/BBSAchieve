import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";

import { getKindeAdminOrgCode } from "./env";
import type { KindeIdentity } from "./identity";
import { verifyBearerToken } from "./jwt";
import { ensureLocalHumanUser } from "./localUser";
import { getWebSessionIdentity } from "./webSession";

type AuthSuccess = {
  ok: true;
  identity: KindeIdentity;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function readBearerToken(request?: Request | null) {
  const authorization = request?.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export async function getRequestIdentity(request?: Request | null): Promise<KindeIdentity | null> {
  const webIdentity = await getWebSessionIdentity().catch(() => null);
  if (webIdentity) {
    return webIdentity;
  }

  const bearerToken = readBearerToken(request);
  if (!bearerToken) {
    return null;
  }

  return verifyBearerToken(bearerToken);
}

export async function requireRouteUser(request?: Request | null): Promise<AuthSuccess | AuthFailure> {
  const identity = await getRequestIdentity(request).catch(() => null);
  if (!identity) {
    return { ok: false, response: unauthorizedResponse() };
  }

  await ensureLocalHumanUser(prisma, identity);
  return { ok: true, identity };
}

export async function requireAdminRouteUser(
  request?: Request | null,
): Promise<AuthSuccess | AuthFailure> {
  const auth = await requireRouteUser(request);
  if (!auth.ok) {
    return auth;
  }

  const adminOrgCode = getKindeAdminOrgCode();
  if (!auth.identity.orgCodes.includes(adminOrgCode)) {
    return { ok: false, response: forbiddenResponse() };
  }

  return auth;
}
