import {
  createRemoteJWKSet,
  errors as joseErrors,
  jwtVerify,
  type JWTPayload,
} from "jose";

import { getKindeApiAudience, getKindeIssuerUrl } from "./env";
import { identityFromJwtClaims } from "./identity";

type EnvSource = Record<string, string | undefined>;

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(issuer: string) {
  const existing = jwksByIssuer.get(issuer);
  if (existing) {
    return existing;
  }

  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  jwksByIssuer.set(issuer, jwks);
  return jwks;
}

function payloadToClaims(payload: JWTPayload): Record<string, unknown> {
  return { ...payload };
}

export async function verifyBearerToken(token: string, env: EnvSource = process.env) {
  const issuer = getKindeIssuerUrl(env);
  const audience = getKindeApiAudience(env);

  try {
    const { payload } = await jwtVerify(token, getJwks(issuer), {
      issuer,
      audience,
    });

    return identityFromJwtClaims(payloadToClaims(payload), "bearer");
  } catch (error) {
    if (error instanceof joseErrors.JOSEError || error instanceof Error) {
      throw new Error(`Kinde token verification failed: ${error.message}`);
    }

    throw new Error("Kinde token verification failed");
  }
}
