import type { KindeIdentity } from "@/src/server/auth/identity";
export function localDevelopmentEnabled() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.LOCAL_DEV_AUTH !== "true"
  )
    return false;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(process.env.DATABASE_URL ?? "").hostname,
    );
  } catch {
    return false;
  }
}
export function localDevelopmentHost(host: string | null) {
  return (
    localDevelopmentEnabled() &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host ?? "")
  );
}
export const localDevelopmentIdentity = (): KindeIdentity => ({
  provider: "kinde",
  subject: "local-dev-admin",
  email: "local@example.invalid",
  givenName: "本地",
  familyName: "管理员",
  name: "本地管理员",
  picture: null,
  orgCodes: [process.env.KINDE_ADMIN_ORG_CODE ?? "local-admin"],
  source: "web",
});
