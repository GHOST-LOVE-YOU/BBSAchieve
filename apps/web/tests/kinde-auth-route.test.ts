import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const kindeServerMock = vi.hoisted(() => ({
  handleAuth: vi.fn(),
  importCount: 0,
}));

vi.mock("@kinde-oss/kinde-auth-nextjs/server", () => {
  kindeServerMock.importCount += 1;
  return {
    handleAuth: kindeServerMock.handleAuth,
  };
});

const kindeEnvNames = [
  "KINDE_ISSUER_URL",
  "NEXT_PUBLIC_KINDE_ISSUER_URL",
  "KINDE_CLIENT_ID",
  "NEXT_PUBLIC_KINDE_CLIENT_ID",
  "KINDE_CLIENT_SECRET",
  "KINDE_SITE_URL",
  "NEXT_PUBLIC_KINDE_SITE_URL",
] as const;

describe("Kinde auth route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    kindeServerMock.importCount = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("can be imported during build without Kinde runtime env vars", async () => {
    for (const name of kindeEnvNames) {
      vi.stubEnv(name, "");
    }

    await expect(import("../app/api/auth/[kindeAuth]/route")).resolves.toMatchObject({
      GET: expect.any(Function),
    });
    expect(kindeServerMock.importCount).toBe(0);
    expect(kindeServerMock.handleAuth).not.toHaveBeenCalled();
  });

  it("delegates GET requests to the Kinde auth handler", async () => {
    const response = new Response("ok", { status: 200 });
    const sdkRouteHandler = vi.fn().mockResolvedValue(response);
    kindeServerMock.handleAuth.mockReturnValue(sdkRouteHandler);

    const { GET } = await import("../app/api/auth/[kindeAuth]/route");
    const request = new Request("http://localhost/api/auth/login");
    const context = { params: Promise.resolve({ kindeAuth: "login" }) };

    await expect(GET(request, context)).resolves.toBe(response);
    expect(kindeServerMock.handleAuth).toHaveBeenCalledTimes(1);
    expect(sdkRouteHandler).toHaveBeenCalledWith(request, context);
  });
});
