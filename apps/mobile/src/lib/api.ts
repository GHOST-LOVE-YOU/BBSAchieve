function getWebBaseUrl() {
  const value = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim();

  if (!value) {
    throw new Error("Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API");
  }

  return value.replace(/\/$/, "");
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getWebBaseUrl()}${path}`);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload.error === "string" ? payload.error : `HTTP ${response.status}`;

    throw Object.assign(new Error(message), { status: response.status });
  }

  return response.json() as Promise<T>;
}
