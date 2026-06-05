import { getRequiredWebBaseUrl } from "@/config/env";
import { getRequiredMobileAccessToken } from "@/features/auth/mobileAuthToken";

function getWebBaseUrl() {
  return getRequiredWebBaseUrl(
    undefined,
    "Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API",
  );
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const url = `${getWebBaseUrl()}${path}`;
  const accessToken = await getRequiredMobileAccessToken();
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload.error === "string" ? payload.error : `HTTP ${response.status}`;

    throw Object.assign(new Error(message), { status: response.status });
  }

  return response.json() as Promise<T>;
}
