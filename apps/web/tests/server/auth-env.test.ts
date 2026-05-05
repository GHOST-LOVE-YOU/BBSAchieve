import { describe, expect, it } from "vitest";

import {
  getKindeAdminOrgCode,
  getKindeApiAudience,
  getKindeIssuerUrl,
  getRequiredEnv,
} from "@/src/server/auth/env";

describe("Kinde auth env", () => {
  it("reads required values and trims whitespace", () => {
    expect(getRequiredEnv("KINDE_TEST_VALUE", { KINDE_TEST_VALUE: "  value  " })).toBe("value");
  });

  it("throws a clear error for missing values", () => {
    expect(() => getRequiredEnv("KINDE_TEST_VALUE", {})).toThrow(
      "Missing required environment variable: KINDE_TEST_VALUE",
    );
  });

  it("normalizes the Kinde issuer URL", () => {
    expect(getKindeIssuerUrl({ KINDE_ISSUER_URL: "https://orlco.kinde.com/" })).toBe(
      "https://orlco.kinde.com",
    );
  });

  it("uses KINDE_API_AUDIENCE before KINDE_AUDIENCE", () => {
    expect(
      getKindeApiAudience({
        KINDE_API_AUDIENCE: "https://bbsachieve.orlco/api",
        KINDE_AUDIENCE: "https://other.example/api",
      }),
    ).toBe("https://bbsachieve.orlco/api");
  });

  it("falls back to KINDE_AUDIENCE for SDK-compatible env", () => {
    expect(getKindeApiAudience({ KINDE_AUDIENCE: "https://bbsachieve.orlco/api" })).toBe(
      "https://bbsachieve.orlco/api",
    );
  });

  it("reads the configured admin org code", () => {
    expect(getKindeAdminOrgCode({ KINDE_ADMIN_ORG_CODE: "org_ed7de8344b99" })).toBe(
      "org_ed7de8344b99",
    );
  });
});
