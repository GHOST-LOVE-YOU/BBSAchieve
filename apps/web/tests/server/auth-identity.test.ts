import { describe, expect, it } from "vitest";

import {
  buildDisplayName,
  buildUsername,
  identityFromJwtClaims,
  readOrgCodesFromClaims,
} from "@/src/server/auth/identity";

describe("Kinde identity parsing", () => {
  it("reads org codes from common Kinde claim shapes", () => {
    expect(readOrgCodesFromClaims({ org_codes: ["org_a", "org_b"] })).toEqual([
      "org_a",
      "org_b",
    ]);
    expect(readOrgCodesFromClaims({ "x-hasura-org-codes": ["org_c"] })).toEqual(["org_c"]);
    expect(readOrgCodesFromClaims({ org_code: "org_d" })).toEqual(["org_d"]);
    expect(readOrgCodesFromClaims({ organizations: [{ code: "org_e" }, { id: "org_f" }] })).toEqual([
      "org_e",
      "org_f",
    ]);
  });

  it("deduplicates and drops empty org codes", () => {
    expect(readOrgCodesFromClaims({ org_codes: ["org_a", "", "org_a", null] })).toEqual([
      "org_a",
    ]);
  });

  it("builds an identity from JWT claims", () => {
    expect(
      identityFromJwtClaims({
        sub: "kp_user_1",
        email: "alice@example.com",
        given_name: "Alice",
        family_name: "Chen",
        name: "Alice Chen",
        org_codes: ["org_ed7de8344b99"],
      }),
    ).toEqual({
      provider: "kinde",
      subject: "kp_user_1",
      email: "alice@example.com",
      givenName: "Alice",
      familyName: "Chen",
      name: "Alice Chen",
      picture: null,
      orgCodes: ["org_ed7de8344b99"],
      source: "bearer",
    });
  });

  it("rejects JWT claims without a subject", () => {
    expect(() => identityFromJwtClaims({ email: "missing@example.com" })).toThrow(
      "Kinde token is missing subject",
    );
  });

  it("derives stable local usernames", () => {
    expect(buildUsername({ subject: "kp_123", email: "alice@example.com" })).toBe("alice");
    expect(buildUsername({ subject: "kp_123", email: null })).toBe("kinde_kp_123");
  });

  it("derives display names", () => {
    expect(
      buildDisplayName({
        subject: "kp_123",
        email: "alice@example.com",
        givenName: "Alice",
        familyName: "Chen",
        name: null,
      }),
    ).toBe("Alice Chen");
    expect(
      buildDisplayName({
        subject: "kp_123",
        email: "alice@example.com",
        givenName: null,
        familyName: null,
        name: null,
      }),
    ).toBe("alice@example.com");
  });
});
