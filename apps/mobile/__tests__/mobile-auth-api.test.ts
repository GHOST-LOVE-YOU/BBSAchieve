import { apiGetJson } from "@/lib/api";
import { getMobileKindeLoginOptions } from "@/config/env";
import {
  clearMobileAccessTokenGetter,
  setMobileAccessTokenGetter,
} from "@/features/auth/mobileAuthToken";

const originalWebBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL;
const originalDisableAuth = process.env.EXPO_PUBLIC_DISABLE_AUTH;
const fetchMock = jest.fn<typeof fetch>();

function restoreEnvValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe("mobile authenticated API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    process.env.EXPO_PUBLIC_WEB_BASE_URL = "https://web.example.com";
    delete process.env.EXPO_PUBLIC_DISABLE_AUTH;
    clearMobileAccessTokenGetter();
  });

  afterAll(() => {
    restoreEnvValue("EXPO_PUBLIC_WEB_BASE_URL", originalWebBaseUrl);
    restoreEnvValue("EXPO_PUBLIC_DISABLE_AUTH", originalDisableAuth);
    clearMobileAccessTokenGetter();
  });

  it("throws before fetching when no access token getter is registered", async () => {
    await expect(apiGetJson("/api/public/boards")).rejects.toThrow(
      "Missing mobile Kinde access token",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds a bearer token to mobile API requests", async () => {
    setMobileAccessTokenGetter(async () => "mobile-token");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await expect(apiGetJson("/api/public/boards")).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("https://web.example.com/api/public/boards", {
      headers: {
        Authorization: "Bearer mobile-token",
      },
    });
  });

  it("skips bearer tokens when local auth is disabled", async () => {
    process.env.EXPO_PUBLIC_DISABLE_AUTH = "true";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await expect(apiGetJson("/api/public/boards")).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://web.example.com/api/public/boards",
      undefined,
    );
  });

  it("passes the API audience and callback URL to Kinde login", () => {
    expect(
      getMobileKindeLoginOptions({
        kindeApiAudience: "https://bbsachieve.orlco/api",
        kindeRedirectUrl: "byrachieve://orlco.kinde.com/kinde_callback",
      }),
    ).toEqual({
      audience: "https://bbsachieve.orlco/api",
      redirectURL: "byrachieve://orlco.kinde.com/kinde_callback",
    });
  });
});
