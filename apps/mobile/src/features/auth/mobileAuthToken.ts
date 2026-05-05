type AccessTokenGetter = () => Promise<string | null>;

let accessTokenGetter: AccessTokenGetter | null = null;

export function setMobileAccessTokenGetter(getter: AccessTokenGetter) {
  accessTokenGetter = getter;
}

export function clearMobileAccessTokenGetter() {
  accessTokenGetter = null;
}

export async function getRequiredMobileAccessToken() {
  const token = await accessTokenGetter?.();
  if (!token) {
    throw new Error("Missing mobile Kinde access token");
  }

  return token;
}
