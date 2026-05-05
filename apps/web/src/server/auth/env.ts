type EnvSource = Record<string, string | undefined>;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getRequiredEnv(name: string, env: EnvSource = process.env): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getKindeIssuerUrl(env: EnvSource = process.env): string {
  return trimTrailingSlash(getRequiredEnv("KINDE_ISSUER_URL", env));
}

export function getKindeApiAudience(env: EnvSource = process.env): string {
  const value = env.KINDE_API_AUDIENCE?.trim() || env.KINDE_AUDIENCE?.trim();
  if (!value) {
    throw new Error("Missing required environment variable: KINDE_API_AUDIENCE");
  }
  return value;
}

export function getKindeAdminOrgCode(env: EnvSource = process.env): string {
  return getRequiredEnv("KINDE_ADMIN_ORG_CODE", env);
}
