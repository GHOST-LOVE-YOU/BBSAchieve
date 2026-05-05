import { apiGetJson } from "@/lib/api";
import {
  clearMobileAccessTokenGetter,
  setMobileAccessTokenGetter,
} from "@/features/auth/mobileAuthToken";
import { getMobileKindeLoginOptions } from "@/features/auth/MobileAuthProvider";

const originalWebBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL;
const fetchMock = jest.fn<typeof fetch>();

describe("mobile authenticated API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    process.env.EXPO_PUBLIC_WEB_BASE_URL = "https://web.example.com";
    clearMobileAccessTokenGetter();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_WEB_BASE_URL = originalWebBaseUrl;
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

  it("passes the API audience and callback URL to Kinde login", () => {
    expect(
      getMobileKindeLoginOptions({
        EXPO_PUBLIC_KINDE_API_AUDIENCE: "https://bbsachieve.orlco/api",
        EXPO_PUBLIC_KINDE_REDIRECT_URL: "byrachieve://orlco.kinde.com/kinde_callback",
      }),
    ).toEqual({
      audience: "https://bbsachieve.orlco/api",
      redirectURL: "byrachieve://orlco.kinde.com/kinde_callback",
    });
  });
});
