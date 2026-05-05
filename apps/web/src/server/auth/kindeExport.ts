import type { KindeIdentity } from "./identity";
import path from "node:path";

type KindeExportIdentity = {
  type?: unknown;
  identity?: unknown;
  profile?: Record<string, unknown>;
};

type KindeExportOrganization = {
  code?: unknown;
  organization_code?: unknown;
  id?: unknown;
};

export type KindeExportUser = {
  id?: unknown;
  email?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  name?: unknown;
  picture?: unknown;
  identities?: KindeExportIdentity[];
  organizations?: KindeExportOrganization[];
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function firstProviderProfile(user: KindeExportUser) {
  return user.identities?.find((identity) => identity.profile)?.profile ?? null;
}

function orgCodesFromExport(user: KindeExportUser) {
  const orgCodes = (user.organizations ?? [])
    .map(
      (organization) =>
        stringValue(organization.code) ??
        stringValue(organization.organization_code) ??
        stringValue(organization.id),
    )
    .filter((code): code is string => Boolean(code));

  return [...new Set(orgCodes)];
}

export function identityFromKindeExportUser(
  user: KindeExportUser,
): KindeIdentity {
  const subject = stringValue(user.id);
  if (!subject) {
    throw new Error("Kinde export user is missing id");
  }

  const profile = firstProviderProfile(user);
  const givenName = stringValue(user.first_name) ?? stringValue(user.given_name);
  const familyName = stringValue(user.last_name) ?? stringValue(user.family_name);
  const profileName = profile
    ? stringValue(profile.name) ?? stringValue(profile.login)
    : null;
  const fullName = [givenName, familyName].filter(Boolean).join(" ") || null;

  return {
    provider: "kinde",
    subject,
    email: stringValue(user.email),
    givenName,
    familyName,
    name: stringValue(user.name) ?? fullName ?? profileName,
    picture:
      stringValue(user.picture) ??
      (profile ? stringValue(profile.avatar_url) : null),
    orgCodes: orgCodesFromExport(user),
    source: "export",
  };
}

export function parseKindeExportUserLine(line: string): KindeIdentity | null {
  if (line.trim().length === 0) {
    return null;
  }

  try {
    return identityFromKindeExportUser(JSON.parse(line) as KindeExportUser);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid Kinde export JSON: ${error.message}`);
    }
    throw error;
  }
}

export function resolveKindeUsersExportPath(
  args: string[],
  options: { cwd?: string } = {},
) {
  const cwd = options.cwd ?? process.cwd();
  const exportPath = args.find((arg) => arg !== "--");
  return path.resolve(cwd, exportPath ?? "../../kinde_export/users.ndjson");
}
