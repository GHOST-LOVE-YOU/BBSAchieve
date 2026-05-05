// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { verifyBearerToken } from "@/src/server/auth/jwt";

async function createSignedToken(input: {
  issuer?: string;
  audience?: string;
  subject?: string;
  expiresIn?: string;
}) {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  const kid = "test-key";

  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        keys: [{ ...publicJwk, kid, alg: "RS256", use: "sig" }],
      }),
    ),
  );

  return new SignJWT({
    email: "alice@example.com",
    given_name: "Alice",
    family_name: "Chen",
    name: "Alice Chen",
    org_codes: ["org_ed7de8344b99"],
  })
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuer(input.issuer ?? "https://orlco.kinde.com")
    .setAudience(input.audience ?? "https://bbsachieve.orlco/api")
    .setSubject(input.subject ?? "kp_alice")
    .setIssuedAt()
    .setExpirationTime(input.expiresIn ?? "5m")
    .sign(privateKey);
}

describe("verifyBearerToken", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("verifies a Kinde access token and returns an identity", async () => {
    const token = await createSignedToken({});

    await expect(
      verifyBearerToken(token, {
        KINDE_ISSUER_URL: "https://orlco.kinde.com",
        KINDE_API_AUDIENCE: "https://bbsachieve.orlco/api",
      }),
    ).resolves.toMatchObject({
      provider: "kinde",
      subject: "kp_alice",
      email: "alice@example.com",
      orgCodes: ["org_ed7de8344b99"],
      source: "bearer",
    });
  });

  it("rejects an unexpected issuer", async () => {
    const token = await createSignedToken({ issuer: "https://evil.example.com" });

    await expect(
      verifyBearerToken(token, {
        KINDE_ISSUER_URL: "https://orlco.kinde.com",
        KINDE_API_AUDIENCE: "https://bbsachieve.orlco/api",
      }),
    ).rejects.toThrow("Kinde token verification failed");
  });

  it("rejects an unexpected audience", async () => {
    const token = await createSignedToken({ audience: "https://other.example/api" });

    await expect(
      verifyBearerToken(token, {
        KINDE_ISSUER_URL: "https://orlco.kinde.com",
        KINDE_API_AUDIENCE: "https://bbsachieve.orlco/api",
      }),
    ).rejects.toThrow("Kinde token verification failed");
  });
});
