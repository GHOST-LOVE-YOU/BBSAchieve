import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { identityFromJwtClaims, type KindeIdentity } from "./identity";

type KindeSessionUser = {
  id?: string | null;
  email?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
  username?: string | null;
};

type KindeSessionOrganizations = {
  orgCodes?: string[] | null;
  orgs?: Array<{ code?: string | null; id?: string | null }> | null;
} | null;

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function identityFromWebSession(input: {
  user: KindeSessionUser;
  organizations?: KindeSessionOrganizations;
}): KindeIdentity {
  const subject = cleanString(input.user.id);
  if (!subject) {
    throw new Error("Kinde session is missing user id");
  }

  const orgCodes = [
    ...(input.organizations?.orgCodes ?? []),
    ...((input.organizations?.orgs ?? [])
      .map((org) => cleanString(org.code) ?? cleanString(org.id))
      .filter((orgCode): orgCode is string => Boolean(orgCode))),
  ];
  const givenName = cleanString(input.user.given_name);
  const familyName = cleanString(input.user.family_name);
  const fullName = [givenName, familyName].filter(Boolean).join(" ") || null;

  return {
    provider: "kinde",
    subject,
    email: cleanString(input.user.email),
    givenName,
    familyName,
    name: cleanString(input.user.username) ?? fullName,
    picture: cleanString(input.user.picture),
    orgCodes: uniqueStrings(orgCodes),
    source: "web",
  };
}

export async function getWebSessionIdentity(): Promise<KindeIdentity | null> {
  const session = getKindeServerSession();
  const isAuthenticated = await session.isAuthenticated();

  if (!isAuthenticated) {
    return null;
  }

  const user = await session.getUser();
  if (!user) {
    return null;
  }

  const organizations = await session.getUserOrganizations();
  const accessToken = await session.getAccessToken();
  const accessClaims =
    accessToken && typeof accessToken === "object"
      ? identityFromJwtClaims(accessToken as unknown as Record<string, unknown>, "web")
      : null;
  const baseIdentity = identityFromWebSession({ user, organizations });

  return {
    ...baseIdentity,
    orgCodes: uniqueStrings([...baseIdentity.orgCodes, ...(accessClaims?.orgCodes ?? [])]),
  };
}
