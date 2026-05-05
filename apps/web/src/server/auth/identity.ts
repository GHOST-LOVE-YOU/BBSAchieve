export type KindeIdentitySource = "web" | "bearer" | "export";

export type KindeIdentity = {
  provider: "kinde";
  subject: string;
  email: string | null;
  givenName: string | null;
  familyName: string | null;
  name: string | null;
  picture: string | null;
  orgCodes: string[];
  source: KindeIdentitySource;
};

type UsernameInput = Pick<KindeIdentity, "subject" | "email">;
type DisplayNameInput = Pick<
  KindeIdentity,
  "subject" | "email" | "givenName" | "familyName" | "name"
>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function uniqueStrings(values: string[]) {
  return [
    ...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  ];
}

export function readOrgCodesFromClaims(claims: Record<string, unknown>): string[] {
  const orgCodes = [
    ...asStringArray(claims.org_codes),
    ...asStringArray(claims["x-hasura-org-codes"]),
  ];

  const orgCode = asString(claims.org_code) ?? asString(claims["x-hasura-org-code"]);
  if (orgCode) {
    orgCodes.push(orgCode);
  }

  if (Array.isArray(claims.organizations)) {
    for (const organization of claims.organizations) {
      if (organization && typeof organization === "object") {
        const record = organization as Record<string, unknown>;
        const code = asString(record.code) ?? asString(record.id);
        if (code) {
          orgCodes.push(code);
        }
      }
    }
  }

  return uniqueStrings(orgCodes);
}

export function identityFromJwtClaims(
  claims: Record<string, unknown>,
  source: KindeIdentitySource = "bearer",
): KindeIdentity {
  const subject = asString(claims.sub);
  if (!subject) {
    throw new Error("Kinde token is missing subject");
  }

  return {
    provider: "kinde",
    subject,
    email: asString(claims.email),
    givenName: asString(claims.given_name),
    familyName: asString(claims.family_name),
    name: asString(claims.name),
    picture: asString(claims.picture),
    orgCodes: readOrgCodesFromClaims(claims),
    source,
  };
}

export function buildUsername(input: UsernameInput): string {
  const emailName = input.email?.split("@")[0]?.trim();
  if (emailName) {
    return emailName.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "");
  }

  return `kinde_${input.subject}`.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}

export function buildDisplayName(input: DisplayNameInput): string {
  if (input.name?.trim()) {
    return input.name.trim();
  }

  const fullName = [input.givenName, input.familyName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return fullName || input.email || buildUsername(input);
}
