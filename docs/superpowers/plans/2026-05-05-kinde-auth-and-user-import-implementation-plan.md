# Kinde 认证与用户导入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入 Kinde，让 Web 帖子详情、帖子 API、admin、Mobile 全局访问具备认证授权，并提供 Kinde 导出用户导入脚本。

**Architecture:** Web 使用 Kinde Next SDK 维护 cookie session，Mobile 使用 Kinde Expo SDK 获取 access token。Web 服务端新增统一 auth helper，将 Web session 和 Mobile bearer token 归一为同一个 Kinde identity，并懒 upsert 到现有 `User + HumanProfile`。Route/page guards 只调用本地 helper，不把 Kinde claim 解析散落到路由中。

**Tech Stack:** Next 16 App Router, Kinde Next SDK `@kinde-oss/kinde-auth-nextjs@2.12.1`, Kinde Expo SDK `@kinde/expo@0.5.3`, Prisma, `jose@6.2.3`, Expo Router, Vitest, Jest, `tsx@4.21.0`.

---

## References

- Kinde Next.js SDK: https://docs.kinde.com/developer-tools/sdks/backend/nextjs-sdk/
- Kinde Expo SDK: https://docs.kinde.com/developer-tools/sdks/native/expo/
- Kinde API protection: https://docs.kinde.com/developer-tools/your-apis/protect-your-api/

## File Structure

Create these focused Web auth files:

- `apps/web/src/server/auth/env.ts`: reads Kinde env values and normalizes issuer URL.
- `apps/web/src/server/auth/identity.ts`: shared Kinde identity types and claim parsing.
- `apps/web/src/server/auth/localUser.ts`: local `User + HumanProfile` upsert.
- `apps/web/src/server/auth/jwt.ts`: bearer JWT verification with Kinde JWKS.
- `apps/web/src/server/auth/webSession.ts`: Kinde cookie session to identity.
- `apps/web/src/server/auth/routeGuards.ts`: Route Handler guard responses.
- `apps/web/src/server/auth/pageGuards.ts`: Server Component/page guard redirects.
- `apps/web/src/server/auth/kindeExport.ts`: Kinde NDJSON export parsing.
- `apps/web/src/server/auth/index.ts`: small barrel export.

Create these Web integration files:

- `apps/web/app/api/auth/[kindeAuth]/route.ts`: Kinde auth handler.
- `apps/web/proxy.ts`: Kinde route proxy for protected Web pages.
- `apps/web/app/admin/layout.tsx`: admin page guard.
- `apps/web/scripts/import-kinde-users.ts`: CLI script for old Kinde export.

Create these Mobile auth files:

- `apps/mobile/src/features/auth/mobileAuthToken.ts`: process-local access token getter used by API client.
- `apps/mobile/src/features/auth/MobileAuthProvider.tsx`: Kinde provider and global auth gate.

Modify existing files:

- `apps/web/package.json`: add Web auth dependencies and `import:kinde-users` script.
- `apps/mobile/package.json`: add Kinde Expo SDK.
- `pnpm-lock.yaml`: dependency lockfile.
- `.gitignore` and `.dockerignore`: ignore `kinde_export/`.
- `apps/web/prisma/schema.prisma`: unique auth subject constraint.
- `apps/web/prisma/migrations/20260505150000_add_human_profile_auth_subject_unique/migration.sql`: DB unique index.
- `apps/web/app/threads/[threadId]/page.tsx`: page-level login guard.
- `apps/web/app/api/public/threads/[threadId]/route.ts`: API auth guard.
- `apps/web/app/api/public/threads/[threadId]/replies/route.ts`: API auth guard.
- `apps/web/app/admin/api/import-jobs/byr-board-full-sync-batch/route.ts`: admin API guard.
- `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`: admin API guard.
- `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`: admin API guard.
- `apps/web/app/admin/api/imports/byr-sync/route.ts`: admin API guard for HTTP POST.
- `apps/web/app/admin/api/scheduled-tasks/[taskKey]/run/route.ts`: admin API guard.
- `apps/mobile/src/app/_layout.tsx`: wrap app with Mobile auth provider.
- `apps/mobile/src/lib/api.ts`: attach bearer token to all Mobile API requests.

Add or modify tests:

- `apps/web/tests/server/auth-env.test.ts`
- `apps/web/tests/server/auth-identity.test.ts`
- `apps/web/tests/server/localHumanUser.test.ts`
- `apps/web/tests/server/kindeJwt.test.ts`
- `apps/web/tests/server/kindeExport.test.ts`
- `apps/web/tests/public-api-routes.test.ts`
- `apps/web/tests/public-routes.test.tsx`
- `apps/web/tests/admin-import-job-routes.test.ts`
- `apps/web/tests/admin-imports-route.test.ts`
- `apps/web/tests/admin-scheduled-tasks-route.test.ts`
- `apps/mobile/__tests__/mobile-routes.test.tsx`
- `apps/mobile/__tests__/mobile-auth-api.test.ts`

---

### Task 1: Dependencies, Ignore Rules, And Local Env

**Files:**
- Modify: `.gitignore`
- Modify: `.dockerignore`
- Modify: `apps/web/package.json`
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`
- Local-only modify: `apps/web/.env`
- Local-only create/modify: `apps/mobile/.env`

- [ ] **Step 1: Install dependencies**

Run:

```bash
corepack pnpm --filter @bbs/web add @kinde-oss/kinde-auth-nextjs@2.12.1 jose@6.2.3
corepack pnpm --filter @bbs/web add -D tsx@4.21.0
corepack pnpm --filter @bbs/mobile add @kinde/expo@0.5.3
```

Expected: `apps/web/package.json`, `apps/mobile/package.json`, and `pnpm-lock.yaml` change. `corepack pnpm --version` prints `10.11.0`.

- [ ] **Step 2: Add import script command**

Modify `apps/web/package.json` scripts so the block includes:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run tests/public-routes.test.tsx",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "import:kinde-users": "tsx scripts/import-kinde-users.ts"
  }
}
```

Keep all existing dependencies added by pnpm.

- [ ] **Step 3: Write failing ignore-rule check**

Run:

```bash
git check-ignore kinde_export/users.ndjson
```

Expected before implementation: command exits `1` and prints nothing, because `kinde_export/` is not ignored yet.

- [ ] **Step 4: Ignore Kinde export data**

Append this exact line to root `.gitignore`:

```gitignore
kinde_export/
```

Append this exact line to root `.dockerignore`:

```dockerignore
kinde_export
```

- [ ] **Step 5: Verify ignored export data**

Run:

```bash
git check-ignore kinde_export/users.ndjson
git status --short
```

Expected: first command prints `kinde_export/users.ndjson`. `git status --short` no longer shows `?? kinde_export/`.

- [ ] **Step 6: Update local Web env without staging it**

Append these values to ignored `apps/web/.env`:

```env
KINDE_ISSUER_URL=https://orlco.kinde.com
KINDE_SITE_URL=http://localhost:3000
KINDE_CLIENT_ID=37d842a20aaa46aa844ba7aa59d77dce
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
KINDE_ADMIN_ORG_CODE=org_ed7de8344b99
KINDE_API_AUDIENCE=https://bbsachieve.orlco/api
KINDE_AUDIENCE=https://bbsachieve.orlco/api
```

Add `KINDE_CLIENT_SECRET` to the same ignored file with the current Kinde Web client secret. Do not paste that secret into any tracked file. `KINDE_AUDIENCE` is required by the Kinde Next SDK; `KINDE_API_AUDIENCE` is used by local auth helpers.

- [ ] **Step 7: Update local Mobile env without staging it**

Create or update ignored `apps/mobile/.env`:

```env
EXPO_PUBLIC_WEB_BASE_URL=http://127.0.0.1:3000
EXPO_PUBLIC_KINDE_DOMAIN=https://orlco.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=fd4871ebb882462a80df2842dba66da0
EXPO_PUBLIC_KINDE_REDIRECT_URL=byrachieve://orlco.kinde.com/kinde_callback
EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URL=byrachieve://orlco.kinde.com/kinde_callback
EXPO_PUBLIC_KINDE_API_AUDIENCE=https://bbsachieve.orlco/api
```

- [ ] **Step 8: Commit dependency and ignore changes**

Run:

```bash
git add .gitignore .dockerignore apps/web/package.json apps/mobile/package.json pnpm-lock.yaml
git commit -m "chore: 添加 Kinde 认证依赖与导出忽略"
```

Expected: commit succeeds. `apps/web/.env`, `apps/mobile/.env`, and `kinde_export/` are not staged.

---

### Task 2: Prisma Unique Constraint For Human Profiles

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/20260505150000_add_human_profile_auth_subject_unique/migration.sql`

- [ ] **Step 1: Write failing schema check**

Run:

```bash
rg -n "@@unique\\(\\[authProvider, authSubject\\]\\)" apps/web/prisma/schema.prisma
```

Expected before implementation: command exits `1`.

- [ ] **Step 2: Add Prisma schema unique constraint**

In `apps/web/prisma/schema.prisma`, update `model HumanProfile` so it includes:

```prisma
model HumanProfile {
  id            String        @id @default(uuid())
  userId        String        @unique
  authProvider  String
  authSubject   String
  email         String?
  profileStatus ProfileStatus
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([authProvider, authSubject])
  @@map("human_profiles")
}
```

- [ ] **Step 3: Add migration SQL**

Create `apps/web/prisma/migrations/20260505150000_add_human_profile_auth_subject_unique/migration.sql`:

```sql
CREATE UNIQUE INDEX "human_profiles_authProvider_authSubject_key"
ON "human_profiles"("authProvider", "authSubject");
```

- [ ] **Step 4: Verify Prisma generation**

Run:

```bash
corepack pnpm --filter @bbs/web prisma:generate
```

Expected: Prisma Client generation completes without errors.

- [ ] **Step 5: Commit Prisma constraint**

Run:

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/20260505150000_add_human_profile_auth_subject_unique/migration.sql
git commit -m "db: 约束 Kinde 真人用户身份唯一"
```

Expected: commit succeeds.

---

### Task 3: Auth Env And Identity Parsing

**Files:**
- Create: `apps/web/src/server/auth/env.ts`
- Create: `apps/web/src/server/auth/identity.ts`
- Create: `apps/web/src/server/auth/index.ts`
- Test: `apps/web/tests/server/auth-env.test.ts`
- Test: `apps/web/tests/server/auth-identity.test.ts`

- [ ] **Step 1: Write failing env tests**

Create `apps/web/tests/server/auth-env.test.ts`:

```ts
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
```

- [ ] **Step 2: Write failing identity tests**

Create `apps/web/tests/server/auth-identity.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/auth-env.test.ts tests/server/auth-identity.test.ts
```

Expected: FAIL with module resolution errors for `@/src/server/auth/env` and `@/src/server/auth/identity`.

- [ ] **Step 4: Implement env helper**

Create `apps/web/src/server/auth/env.ts`:

```ts
type EnvSource = Record<string, string | undefined>;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getRequiredEnv(name: string, env: EnvSource = process.env): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getKindeIssuerUrl(env: EnvSource = process.env): string {
  return trimTrailingSlash(getRequiredEnv("KINDE_ISSUER_URL", env));
}

export function getKindeApiAudience(env: EnvSource = process.env): string {
  const value = env.KINDE_API_AUDIENCE?.trim() || env.KINDE_AUDIENCE?.trim();
  if (!value) {
    throw new Error("Missing required environment variable: KINDE_API_AUDIENCE");
  }
  return value;
}

export function getKindeAdminOrgCode(env: EnvSource = process.env): string {
  return getRequiredEnv("KINDE_ADMIN_ORG_CODE", env);
}
```

- [ ] **Step 5: Implement identity helper**

Create `apps/web/src/server/auth/identity.ts`:

```ts
export type KindeIdentitySource = "web" | "bearer" | "export";

export type KindeIdentity = {
  provider: "kinde";
  subject: string;
  email: string | null;
  givenName: string | null;
  familyName: string | null;
  name: string | null;
  picture: string | null;
  orgCodes: string[];
  source: KindeIdentitySource;
};

type UsernameInput = Pick<KindeIdentity, "subject" | "email">;
type DisplayNameInput = Pick<KindeIdentity, "subject" | "email" | "givenName" | "familyName" | "name">;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

export function readOrgCodesFromClaims(claims: Record<string, unknown>): string[] {
  const orgCodes = [
    ...asStringArray(claims.org_codes),
    ...asStringArray(claims["x-hasura-org-codes"]),
  ];

  const orgCode = asString(claims.org_code) ?? asString(claims["x-hasura-org-code"]);
  if (orgCode) {
    orgCodes.push(orgCode);
  }

  if (Array.isArray(claims.organizations)) {
    for (const organization of claims.organizations) {
      if (organization && typeof organization === "object") {
        const record = organization as Record<string, unknown>;
        const code = asString(record.code) ?? asString(record.id);
        if (code) {
          orgCodes.push(code);
        }
      }
    }
  }

  return uniqueStrings(orgCodes);
}

export function identityFromJwtClaims(
  claims: Record<string, unknown>,
  source: KindeIdentitySource = "bearer",
): KindeIdentity {
  const subject = asString(claims.sub);
  if (!subject) {
    throw new Error("Kinde token is missing subject");
  }

  return {
    provider: "kinde",
    subject,
    email: asString(claims.email),
    givenName: asString(claims.given_name),
    familyName: asString(claims.family_name),
    name: asString(claims.name),
    picture: asString(claims.picture),
    orgCodes: readOrgCodesFromClaims(claims),
    source,
  };
}

export function buildUsername(input: UsernameInput): string {
  const emailName = input.email?.split("@")[0]?.trim();
  if (emailName) {
    return emailName.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "");
  }

  return `kinde_${input.subject}`.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_");
}

export function buildDisplayName(input: DisplayNameInput): string {
  if (input.name?.trim()) {
    return input.name.trim();
  }

  const fullName = [input.givenName, input.familyName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return fullName || input.email || buildUsername(input);
}
```

- [ ] **Step 6: Add auth barrel**

Create `apps/web/src/server/auth/index.ts`:

```ts
export * from "./env";
export * from "./identity";
```

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/auth-env.test.ts tests/server/auth-identity.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit env and identity helpers**

Run:

```bash
git add apps/web/src/server/auth apps/web/tests/server/auth-env.test.ts apps/web/tests/server/auth-identity.test.ts
git commit -m "feat: 增加 Kinde 身份解析基础"
```

Expected: commit succeeds.

---

### Task 4: Local Human User Upsert

**Files:**
- Create: `apps/web/src/server/auth/localUser.ts`
- Modify: `apps/web/src/server/auth/index.ts`
- Test: `apps/web/tests/server/localHumanUser.test.ts`

- [ ] **Step 1: Write failing local user tests**

Create `apps/web/tests/server/localHumanUser.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { ensureLocalHumanUser } from "@/src/server/auth/localUser";
import type { KindeIdentity } from "@/src/server/auth/identity";

function createPrismaMock(existingProfile: any = null) {
  return {
    humanProfile: {
      findFirst: vi.fn().mockResolvedValue(existingProfile),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      create: vi.fn().mockResolvedValue({
        id: "user-created",
        username: "alice",
        displayName: "Alice Chen",
        userType: "human",
        status: "active",
      }),
      update: vi.fn().mockResolvedValue({
        id: "user-existing",
        username: "alice",
        displayName: "Alice Chen",
        userType: "human",
        status: "active",
      }),
    },
  };
}

const identity: KindeIdentity = {
  provider: "kinde",
  subject: "kp_alice",
  email: "alice@example.com",
  givenName: "Alice",
  familyName: "Chen",
  name: "Alice Chen",
  picture: "https://example.com/alice.png",
  orgCodes: ["org_ed7de8344b99"],
  source: "bearer",
};

describe("ensureLocalHumanUser", () => {
  it("creates a local user and human profile for a new Kinde identity", async () => {
    const prisma = createPrismaMock();

    await ensureLocalHumanUser(prisma as any, identity);

    expect(prisma.humanProfile.findFirst).toHaveBeenCalledWith({
      where: { authProvider: "kinde", authSubject: "kp_alice" },
      include: { user: true },
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: "alice",
        displayName: "Alice Chen",
        avatarUrl: "https://example.com/alice.png",
        bio: null,
        userType: "human",
        status: "active",
        mailboxKey: null,
        humanProfile: {
          create: {
            authProvider: "kinde",
            authSubject: "kp_alice",
            email: "alice@example.com",
            profileStatus: "active",
          },
        },
      },
    });
  });

  it("updates the existing local user and human profile", async () => {
    const prisma = createPrismaMock({
      id: "profile-existing",
      userId: "user-existing",
      user: {
        id: "user-existing",
        username: "old",
        displayName: "Old",
        userType: "human",
        status: "active",
      },
    });

    const result = await ensureLocalHumanUser(prisma as any, identity);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-existing" },
      data: {
        username: "alice",
        displayName: "Alice Chen",
        avatarUrl: "https://example.com/alice.png",
        status: "active",
      },
    });
    expect(prisma.humanProfile.update).toHaveBeenCalledWith({
      where: { id: "profile-existing" },
      data: {
        email: "alice@example.com",
        profileStatus: "active",
      },
    });
    expect(result.id).toBe("user-existing");
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/localHumanUser.test.ts
```

Expected: FAIL with module resolution error for `localUser`.

- [ ] **Step 3: Implement local user upsert**

Create `apps/web/src/server/auth/localUser.ts`:

```ts
import type { PrismaClient } from "@prisma/client";

import {
  buildDisplayName,
  buildUsername,
  type KindeIdentity,
} from "./identity";

type HumanUserPrisma = Pick<PrismaClient, "humanProfile" | "user">;

export async function ensureLocalHumanUser(
  prismaClient: HumanUserPrisma,
  identity: KindeIdentity,
) {
  const existingProfile = await prismaClient.humanProfile.findFirst({
    where: {
      authProvider: identity.provider,
      authSubject: identity.subject,
    },
    include: { user: true },
  });

  const username = buildUsername(identity);
  const displayName = buildDisplayName(identity);

  if (existingProfile) {
    const user = await prismaClient.user.update({
      where: { id: existingProfile.userId },
      data: {
        username,
        displayName,
        avatarUrl: identity.picture,
        status: "active",
      },
    });

    await prismaClient.humanProfile.update({
      where: { id: existingProfile.id },
      data: {
        email: identity.email,
        profileStatus: "active",
      },
    });

    return user;
  }

  return prismaClient.user.create({
    data: {
      username,
      displayName,
      avatarUrl: identity.picture,
      bio: null,
      userType: "human",
      status: "active",
      mailboxKey: null,
      humanProfile: {
        create: {
          authProvider: identity.provider,
          authSubject: identity.subject,
          email: identity.email,
          profileStatus: "active",
        },
      },
    },
  });
}
```

- [ ] **Step 4: Export local user helper**

Modify `apps/web/src/server/auth/index.ts`:

```ts
export * from "./env";
export * from "./identity";
export * from "./localUser";
```

- [ ] **Step 5: Run test and verify pass**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/localHumanUser.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit local user helper**

Run:

```bash
git add apps/web/src/server/auth apps/web/tests/server/localHumanUser.test.ts
git commit -m "feat: 懒创建 Kinde 真人用户"
```

Expected: commit succeeds.

---

### Task 5: Bearer JWT Verification

**Files:**
- Create: `apps/web/src/server/auth/jwt.ts`
- Modify: `apps/web/src/server/auth/index.ts`
- Test: `apps/web/tests/server/kindeJwt.test.ts`

- [ ] **Step 1: Write failing JWT tests**

Create `apps/web/tests/server/kindeJwt.test.ts`:

```ts
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
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        keys: [{ ...publicJwk, kid, alg: "RS256", use: "sig" }],
      }),
    })),
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
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/kindeJwt.test.ts
```

Expected: FAIL with module resolution error for `jwt`.

- [ ] **Step 3: Implement JWT verification**

Create `apps/web/src/server/auth/jwt.ts`:

```ts
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
```

- [ ] **Step 4: Export JWT helper**

Modify `apps/web/src/server/auth/index.ts`:

```ts
export * from "./env";
export * from "./identity";
export * from "./localUser";
export * from "./jwt";
```

- [ ] **Step 5: Run test and verify pass**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/kindeJwt.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit JWT verification**

Run:

```bash
git add apps/web/src/server/auth apps/web/tests/server/kindeJwt.test.ts
git commit -m "feat: 校验 Kinde API 访问令牌"
```

Expected: commit succeeds.

---

### Task 6: Web Session And Route Guards

**Files:**
- Create: `apps/web/src/server/auth/webSession.ts`
- Create: `apps/web/src/server/auth/routeGuards.ts`
- Create: `apps/web/src/server/auth/pageGuards.ts`
- Modify: `apps/web/src/server/auth/index.ts`
- Test: `apps/web/tests/server/auth-identity.test.ts`

- [ ] **Step 1: Extend identity tests for Web session shapes**

Append to `apps/web/tests/server/auth-identity.test.ts`:

```ts
import { identityFromWebSession } from "@/src/server/auth/webSession";

describe("Kinde web session parsing", () => {
  it("combines Kinde user and organization response into a shared identity", () => {
    expect(
      identityFromWebSession({
        user: {
          id: "kp_web",
          email: "web@example.com",
          given_name: "Web",
          family_name: "User",
          picture: null,
        },
        organizations: {
          orgCodes: ["org_ed7de8344b99"],
          orgs: [],
        },
      }),
    ).toEqual({
      provider: "kinde",
      subject: "kp_web",
      email: "web@example.com",
      givenName: "Web",
      familyName: "User",
      name: "Web User",
      picture: null,
      orgCodes: ["org_ed7de8344b99"],
      source: "web",
    });
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/auth-identity.test.ts
```

Expected: FAIL with module resolution error for `webSession`.

- [ ] **Step 3: Implement Web session identity helper**

Create `apps/web/src/server/auth/webSession.ts`:

```ts
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { identityFromJwtClaims, type KindeIdentity } from "./identity";

type KindeSessionUser = {
  id?: string | null;
  email?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
  username?: string | null;
};

type KindeSessionOrganizations = {
  orgCodes?: string[] | null;
  orgs?: Array<{ code?: string | null; id?: string | null }> | null;
} | null;

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function identityFromWebSession(input: {
  user: KindeSessionUser;
  organizations?: KindeSessionOrganizations;
}): KindeIdentity {
  const subject = cleanString(input.user.id);
  if (!subject) {
    throw new Error("Kinde session is missing user id");
  }

  const orgCodes = [
    ...(input.organizations?.orgCodes ?? []),
    ...((input.organizations?.orgs ?? [])
      .map((org) => cleanString(org.code) ?? cleanString(org.id))
      .filter((orgCode): orgCode is string => Boolean(orgCode))),
  ];
  const givenName = cleanString(input.user.given_name);
  const familyName = cleanString(input.user.family_name);
  const fullName = [givenName, familyName].filter(Boolean).join(" ") || null;

  return {
    provider: "kinde",
    subject,
    email: cleanString(input.user.email),
    givenName,
    familyName,
    name: cleanString(input.user.username) ?? fullName,
    picture: cleanString(input.user.picture),
    orgCodes: [...new Set(orgCodes)],
    source: "web",
  };
}

export async function getWebSessionIdentity(): Promise<KindeIdentity | null> {
  const session = getKindeServerSession();
  const isAuthenticated = await session.isAuthenticated();

  if (!isAuthenticated) {
    return null;
  }

  const user = await session.getUser();
  if (!user) {
    return null;
  }

  const organizations = await session.getUserOrganizations();
  const accessToken = await session.getAccessToken();
  const accessClaims = accessToken ? identityFromJwtClaims(accessToken as unknown as Record<string, unknown>, "web") : null;
  const baseIdentity = identityFromWebSession({ user, organizations });

  return {
    ...baseIdentity,
    orgCodes: [...new Set([...baseIdentity.orgCodes, ...(accessClaims?.orgCodes ?? [])])],
  };
}
```

- [ ] **Step 4: Implement route guards**

Create `apps/web/src/server/auth/routeGuards.ts`:

```ts
import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";

import { getKindeAdminOrgCode } from "./env";
import { verifyBearerToken } from "./jwt";
import { ensureLocalHumanUser } from "./localUser";
import { getWebSessionIdentity } from "./webSession";
import type { KindeIdentity } from "./identity";

type AuthSuccess = {
  ok: true;
  identity: KindeIdentity;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function readBearerToken(request?: Request | null) {
  const authorization = request?.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

export async function getRequestIdentity(request?: Request | null): Promise<KindeIdentity | null> {
  const webIdentity = await getWebSessionIdentity().catch(() => null);
  if (webIdentity) {
    return webIdentity;
  }

  const bearerToken = readBearerToken(request);
  if (!bearerToken) {
    return null;
  }

  return verifyBearerToken(bearerToken);
}

export async function requireRouteUser(request?: Request | null): Promise<AuthSuccess | AuthFailure> {
  const identity = await getRequestIdentity(request).catch(() => null);
  if (!identity) {
    return { ok: false, response: unauthorizedResponse() };
  }

  await ensureLocalHumanUser(prisma, identity);
  return { ok: true, identity };
}

export async function requireAdminRouteUser(request?: Request | null): Promise<AuthSuccess | AuthFailure> {
  const auth = await requireRouteUser(request);
  if (!auth.ok) {
    return auth;
  }

  const adminOrgCode = getKindeAdminOrgCode();
  if (!auth.identity.orgCodes.includes(adminOrgCode)) {
    return { ok: false, response: forbiddenResponse() };
  }

  return auth;
}
```

- [ ] **Step 5: Implement page guards**

Create `apps/web/src/server/auth/pageGuards.ts`:

```ts
import { redirect } from "next/navigation";

import { prisma } from "@/src/server/db/client";

import { getKindeAdminOrgCode } from "./env";
import { ensureLocalHumanUser } from "./localUser";
import { getWebSessionIdentity } from "./webSession";

function loginUrl(returnTo: string) {
  const searchParams = new URLSearchParams({
    post_login_redirect_url: returnTo,
  });
  return `/api/auth/login?${searchParams.toString()}`;
}

export async function requireWebPageUser(returnTo: string) {
  const identity = await getWebSessionIdentity();
  if (!identity) {
    redirect(loginUrl(returnTo));
  }

  await ensureLocalHumanUser(prisma, identity);
  return identity;
}

export async function requireAdminPageUser(returnTo = "/admin") {
  const identity = await requireWebPageUser(returnTo);
  const adminOrgCode = getKindeAdminOrgCode();

  if (!identity.orgCodes.includes(adminOrgCode)) {
    redirect("/");
  }

  return identity;
}
```

- [ ] **Step 6: Export guards**

Modify `apps/web/src/server/auth/index.ts`:

```ts
export * from "./env";
export * from "./identity";
export * from "./localUser";
export * from "./jwt";
export * from "./webSession";
export * from "./routeGuards";
export * from "./pageGuards";
```

- [ ] **Step 7: Run tests and verify pass**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/auth-identity.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit guards**

Run:

```bash
git add apps/web/src/server/auth apps/web/tests/server/auth-identity.test.ts
git commit -m "feat: 统一 Web 与 API 认证守卫"
```

Expected: commit succeeds.

---

### Task 7: Kinde Web Routes, Proxy, And Protected Pages

**Files:**
- Create: `apps/web/app/api/auth/[kindeAuth]/route.ts`
- Create: `apps/web/proxy.ts`
- Create: `apps/web/app/admin/layout.tsx`
- Modify: `apps/web/app/threads/[threadId]/page.tsx`
- Test: `apps/web/tests/public-routes.test.tsx`

- [ ] **Step 1: Mock page guard in route tests**

In `apps/web/tests/public-routes.test.tsx`, add this mock near the existing mocks:

```ts
const pageGuardMock = vi.hoisted(() => ({
  requireWebPageUser: vi.fn(),
}));

vi.mock("@/src/server/auth/pageGuards", () => ({
  requireWebPageUser: pageGuardMock.requireWebPageUser,
}));
```

Append this test inside `describe("web public routes", () => { ... })`:

```ts
it("requires login before rendering thread detail", async () => {
  publicReadingMock.getThread.mockResolvedValue({
    board: {
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
    },
    thread: {
      id: "thread:first-offer",
      title: "First offer from the mirror",
      body: "A new listing has been mirrored and is ready to read.",
      authorName: "Robot 1",
      publishedAt: "2026-05-01T08:00:00.000Z",
      replyCount: 2,
    },
  });
  publicReadingMock.getThreadRepliesFeed.mockResolvedValue({
    items: [],
    page: { limit: 20, nextCursor: null, hasMore: false },
  });

  render(
    await ThreadPage({
      params: Promise.resolve({ threadId: "first-offer" }),
    }),
  );

  expect(pageGuardMock.requireWebPageUser).toHaveBeenCalledWith("/threads/first-offer");
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/public-routes.test.tsx -t "requires login"
```

Expected: FAIL because `requireWebPageUser` is not called yet.

- [ ] **Step 3: Add Kinde auth handler**

Create `apps/web/app/api/auth/[kindeAuth]/route.ts`:

```ts
import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";

export const GET = handleAuth();
```

- [ ] **Step 4: Add protected route proxy**

Create `apps/web/proxy.ts`:

```ts
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

export default withAuth({
  isReturnToCurrentPage: true,
});

export const config = {
  matcher: ["/threads/:path*", "/admin/:path*"],
};
```

- [ ] **Step 5: Add admin layout guard**

Create `apps/web/app/admin/layout.tsx`:

```tsx
import { requireAdminPageUser } from "@/src/server/auth/pageGuards";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminPageUser("/admin");

  return <>{children}</>;
}
```

- [ ] **Step 6: Protect thread page**

Modify `apps/web/app/threads/[threadId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { requireWebPageUser } from "@/src/server/auth/pageGuards";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";
```

Then after `const { threadId } = await params;`, add:

```ts
  await requireWebPageUser(`/threads/${threadId}`);
```

- [ ] **Step 7: Run public route tests**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/public-routes.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Web route integration**

Run:

```bash
git add apps/web/app/api/auth apps/web/proxy.ts apps/web/app/admin/layout.tsx apps/web/app/threads/[threadId]/page.tsx apps/web/tests/public-routes.test.tsx
git commit -m "feat: 接入 Kinde Web 页面认证"
```

Expected: commit succeeds.

---

### Task 8: Protect Thread Public APIs

**Files:**
- Modify: `apps/web/app/api/public/threads/[threadId]/route.ts`
- Modify: `apps/web/app/api/public/threads/[threadId]/replies/route.ts`
- Test: `apps/web/tests/public-api-routes.test.ts`

- [ ] **Step 1: Mock API guard and add thread API tests**

In `apps/web/tests/public-api-routes.test.ts`, add this mock near the existing mocks:

```ts
const authGuardMock = vi.hoisted(() => ({
  requireRouteUser: vi.fn(),
}));

vi.mock("@/src/server/auth/routeGuards", () => ({
  requireRouteUser: authGuardMock.requireRouteUser,
}));
```

In `beforeEach`, add:

```ts
    authGuardMock.requireRouteUser.mockResolvedValue({
      ok: true,
      identity: { provider: "kinde", subject: "kp_test", orgCodes: [] },
    });
```

Append these tests:

```ts
  it("keeps boards APIs anonymous", async () => {
    publicReadingServiceMock.listBoards.mockResolvedValue({ boards: [] });

    const response = await getBoards();

    expect(response.status).toBe(200);
    expect(authGuardMock.requireRouteUser).not.toHaveBeenCalled();
  });

  it("returns 401 for anonymous thread detail API access", async () => {
    authGuardMock.requireRouteUser.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await getThread(
      new Request("http://localhost/api/public/threads/first-offer"),
      { params: Promise.resolve({ threadId: "first-offer" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(publicReadingServiceMock.getThread).not.toHaveBeenCalled();
  });

  it("returns 401 for anonymous thread replies API access", async () => {
    authGuardMock.requireRouteUser.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await getThreadRepliesFeed(
      new Request("http://localhost/api/public/threads/first-offer/replies"),
      { params: Promise.resolve({ threadId: "first-offer" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(publicReadingServiceMock.getThreadRepliesFeed).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/public-api-routes.test.ts -t "anonymous thread"
```

Expected: FAIL because thread API routes still read the service without auth.

- [ ] **Step 3: Protect thread detail API**

Modify `apps/web/app/api/public/threads/[threadId]/route.ts`:

```ts
import { NextResponse } from "next/server";

import { requireRouteUser } from "@/src/server/auth/routeGuards";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";
```

At the start of `GET`, before `try`, add:

```ts
  const auth = await requireRouteUser(_request);
  if (!auth.ok) {
    return auth.response;
  }
```

- [ ] **Step 4: Protect thread replies API**

Modify `apps/web/app/api/public/threads/[threadId]/replies/route.ts`:

```ts
import { NextResponse } from "next/server";

import { requireRouteUser } from "@/src/server/auth/routeGuards";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";
```

At the start of `GET`, before `try`, add:

```ts
  const auth = await requireRouteUser(request);
  if (!auth.ok) {
    return auth.response;
  }
```

- [ ] **Step 5: Run public API route tests**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/public-api-routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit thread API protection**

Run:

```bash
git add apps/web/app/api/public/threads/[threadId]/route.ts apps/web/app/api/public/threads/[threadId]/replies/route.ts apps/web/tests/public-api-routes.test.ts
git commit -m "feat: 保护帖子公开 API"
```

Expected: commit succeeds.

---

### Task 9: Protect Admin APIs

**Files:**
- Modify: `apps/web/app/admin/api/import-jobs/byr-board-full-sync-batch/route.ts`
- Modify: `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`
- Modify: `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`
- Modify: `apps/web/app/admin/api/imports/byr-sync/route.ts`
- Modify: `apps/web/app/admin/api/scheduled-tasks/[taskKey]/run/route.ts`
- Modify: `apps/web/tests/admin-import-job-routes.test.ts`
- Modify: `apps/web/tests/admin-imports-route.test.ts`
- Modify: `apps/web/tests/admin-scheduled-tasks-route.test.ts`

- [ ] **Step 1: Mock admin guard in admin API tests**

In each of these test files:

- `apps/web/tests/admin-import-job-routes.test.ts`
- `apps/web/tests/admin-imports-route.test.ts`
- `apps/web/tests/admin-scheduled-tasks-route.test.ts`

Add this mock near the existing `vi.mock` calls:

```ts
const adminAuthGuardMock = vi.hoisted(() => ({
  requireAdminRouteUser: vi.fn(),
}));

vi.mock("@/src/server/auth/routeGuards", () => ({
  requireAdminRouteUser: adminAuthGuardMock.requireAdminRouteUser,
}));
```

In each file's `beforeEach`, add:

```ts
    adminAuthGuardMock.requireAdminRouteUser.mockResolvedValue({
      ok: true,
      identity: {
        provider: "kinde",
        subject: "kp_admin",
        orgCodes: ["org_ed7de8344b99"],
      },
    });
```

- [ ] **Step 2: Add unauthorized admin route test**

Append this test to `apps/web/tests/admin-import-job-routes.test.ts`:

```ts
  it("returns 401 before starting a batch job when admin auth fails", async () => {
    adminAuthGuardMock.requireAdminRouteUser.mockResolvedValueOnce({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const formData = new FormData();
    formData.append("boardNames", "IWhisper");
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync-batch", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(response.status).toBe(401);
    expect(routeMocks.createBoardBatchFullSyncJob).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: Run test and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/admin-import-job-routes.test.ts -t "admin auth fails"
```

Expected: FAIL because the route does not call `requireAdminRouteUser`.

- [ ] **Step 4: Guard batch start route**

Modify `apps/web/app/admin/api/import-jobs/byr-board-full-sync-batch/route.ts`:

```ts
import { requireAdminRouteUser } from "@/src/server/auth/routeGuards";
```

At the start of `POST`, before reading form data, add:

```ts
  const auth = await requireAdminRouteUser(request);
  if (!auth.ok) {
    return auth.response;
  }
```

- [ ] **Step 5: Guard batch resume route**

Modify `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`:

```ts
import { requireAdminRouteUser } from "@/src/server/auth/routeGuards";
```

At the start of `POST`, before `const redirectTo = await readRedirectTo(request);`, add:

```ts
  const auth = await requireAdminRouteUser(request);
  if (!auth.ok) {
    return auth.response;
  }
```

- [ ] **Step 6: Guard batch stop route**

Modify `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`:

```ts
import { requireAdminRouteUser } from "@/src/server/auth/routeGuards";
```

At the start of `POST`, before `const redirectTo = await readRedirectTo(request);`, add:

```ts
  const auth = await requireAdminRouteUser(request);
  if (!auth.ok) {
    return auth.response;
  }
```

- [ ] **Step 7: Guard manual BYR sync HTTP route**

Modify `apps/web/app/admin/api/imports/byr-sync/route.ts`:

```ts
import { requireAdminRouteUser } from "@/src/server/auth/routeGuards";
```

At the start of `POST`, before `const redirectTo = request ? await readRedirectTo(request) : null;`, add:

```ts
  const auth = await requireAdminRouteUser(request);
  if (!auth.ok) {
    return auth.response;
  }
```

Keep `runByrSyncImport()` unchanged, because scheduler code calls that function internally and should not require an HTTP request.

- [ ] **Step 8: Guard scheduled task run route**

Modify `apps/web/app/admin/api/scheduled-tasks/[taskKey]/run/route.ts`:

```ts
import { requireAdminRouteUser } from "@/src/server/auth/routeGuards";
```

At the start of `POST`, before the `try`, add:

```ts
  const auth = await requireAdminRouteUser(request);
  if (!auth.ok) {
    return auth.response;
  }
```

- [ ] **Step 9: Run admin API tests**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/admin-import-job-routes.test.ts tests/admin-imports-route.test.ts tests/admin-scheduled-tasks-route.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit admin API protection**

Run:

```bash
git add apps/web/app/admin/api apps/web/tests/admin-import-job-routes.test.ts apps/web/tests/admin-imports-route.test.ts apps/web/tests/admin-scheduled-tasks-route.test.ts
git commit -m "feat: 保护管理后台 API"
```

Expected: commit succeeds.

---

### Task 10: Kinde Export Parser And Import Script

**Files:**
- Create: `apps/web/src/server/auth/kindeExport.ts`
- Create: `apps/web/scripts/import-kinde-users.ts`
- Modify: `apps/web/src/server/auth/index.ts`
- Test: `apps/web/tests/server/kindeExport.test.ts`

- [ ] **Step 1: Write failing Kinde export tests**

Create `apps/web/tests/server/kindeExport.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { identityFromKindeExportUser, parseKindeExportUserLine } from "@/src/server/auth/kindeExport";

describe("Kinde export parsing", () => {
  it("parses a users.ndjson line into a Kinde identity", () => {
    const line = JSON.stringify({
      id: "kp_123",
      email: "alice@example.com",
      first_name: "Alice",
      last_name: "Chen",
      identities: [{ type: "email", identity: "alice@example.com" }],
      organizations: [{ code: "org_ed7de8344b99" }],
    });

    expect(parseKindeExportUserLine(line)).toEqual({
      provider: "kinde",
      subject: "kp_123",
      email: "alice@example.com",
      givenName: "Alice",
      familyName: "Chen",
      name: "Alice Chen",
      picture: null,
      orgCodes: ["org_ed7de8344b99"],
      source: "export",
    });
  });

  it("returns null for blank lines", () => {
    expect(parseKindeExportUserLine("   ")).toBeNull();
  });

  it("uses provider profile names when top-level names are missing", () => {
    expect(
      identityFromKindeExportUser({
        id: "kp_456",
        email: "github@example.com",
        identities: [
          {
            type: "oauth2:github",
            profile: {
              name: "GitHub User",
              avatar_url: "https://avatars.example.com/u/1",
            },
          },
        ],
        organizations: [{ code: "org_a" }],
      }),
    ).toMatchObject({
      subject: "kp_456",
      email: "github@example.com",
      name: "GitHub User",
      picture: "https://avatars.example.com/u/1",
      orgCodes: ["org_a"],
    });
  });

  it("throws a clear error for malformed records", () => {
    expect(() => parseKindeExportUserLine("{")).toThrow("Invalid Kinde export JSON");
    expect(() => identityFromKindeExportUser({ email: "missing-id@example.com" })).toThrow(
      "Kinde export user is missing id",
    );
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/kindeExport.test.ts
```

Expected: FAIL with module resolution error for `kindeExport`.

- [ ] **Step 3: Implement Kinde export parser**

Create `apps/web/src/server/auth/kindeExport.ts`:

```ts
import type { KindeIdentity } from "./identity";

type KindeExportIdentity = {
  type?: unknown;
  identity?: unknown;
  profile?: Record<string, unknown>;
};

type KindeExportOrganization = {
  code?: unknown;
  organization_code?: unknown;
  id?: unknown;
};

type KindeExportUser = {
  id?: unknown;
  email?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  name?: unknown;
  picture?: unknown;
  identities?: KindeExportIdentity[];
  organizations?: KindeExportOrganization[];
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function firstProviderProfile(user: KindeExportUser) {
  return user.identities?.find((identity) => identity.profile)?.profile ?? null;
}

function orgCodesFromExport(user: KindeExportUser) {
  const orgCodes = (user.organizations ?? [])
    .map((organization) =>
      stringValue(organization.code) ??
      stringValue(organization.organization_code) ??
      stringValue(organization.id),
    )
    .filter((code): code is string => Boolean(code));

  return [...new Set(orgCodes)];
}

export function identityFromKindeExportUser(user: KindeExportUser): KindeIdentity {
  const subject = stringValue(user.id);
  if (!subject) {
    throw new Error("Kinde export user is missing id");
  }

  const profile = firstProviderProfile(user);
  const givenName = stringValue(user.first_name) ?? stringValue(user.given_name);
  const familyName = stringValue(user.last_name) ?? stringValue(user.family_name);
  const profileName = profile ? stringValue(profile.name) ?? stringValue(profile.login) : null;
  const fullName = [givenName, familyName].filter(Boolean).join(" ") || null;

  return {
    provider: "kinde",
    subject,
    email: stringValue(user.email),
    givenName,
    familyName,
    name: stringValue(user.name) ?? fullName ?? profileName,
    picture: stringValue(user.picture) ?? (profile ? stringValue(profile.avatar_url) : null),
    orgCodes: orgCodesFromExport(user),
    source: "export",
  };
}

export function parseKindeExportUserLine(line: string): KindeIdentity | null {
  if (line.trim().length === 0) {
    return null;
  }

  try {
    return identityFromKindeExportUser(JSON.parse(line) as KindeExportUser);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid Kinde export JSON: ${error.message}`);
    }
    throw error;
  }
}
```

- [ ] **Step 4: Export Kinde export parser**

Modify `apps/web/src/server/auth/index.ts`:

```ts
export * from "./env";
export * from "./identity";
export * from "./localUser";
export * from "./jwt";
export * from "./webSession";
export * from "./routeGuards";
export * from "./pageGuards";
export * from "./kindeExport";
```

- [ ] **Step 5: Create import script**

Create `apps/web/scripts/import-kinde-users.ts`:

```ts
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { PrismaClient } from "@prisma/client";

import {
  ensureLocalHumanUser,
  parseKindeExportUserLine,
} from "../src/server/auth";

const prisma = new PrismaClient();

function defaultExportPath() {
  return path.resolve(process.cwd(), "../../kinde_export/users.ndjson");
}

async function assertReadable(filePath: string) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Kinde users export not found: ${filePath}`);
  }
}

async function importUsers(filePath: string) {
  await assertReadable(filePath);

  let read = 0;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const stream = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of stream) {
    read += 1;
    try {
      const identity = parseKindeExportUserLine(line);
      if (!identity) {
        skipped += 1;
        continue;
      }

      await ensureLocalHumanUser(prisma, identity);
      imported += 1;
    } catch (error) {
      errors.push(`line ${read}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { read, imported, skipped, errors };
}

async function main() {
  const filePath = path.resolve(process.cwd(), process.argv[2] ?? defaultExportPath());
  const result = await importUsers(filePath);

  console.log(`Kinde users export: ${filePath}`);
  console.log(`Read: ${result.read}`);
  console.log(`Imported or updated: ${result.imported}`);
  console.log(`Skipped: ${result.skipped}`);

  if (result.errors.length > 0) {
    console.error("Errors:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 6: Run parser tests**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run tests/server/kindeExport.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run script against local export**

Run:

```bash
corepack pnpm --filter @bbs/web import:kinde-users -- ../../kinde_export/users.ndjson
```

Expected: output includes `Read: 29` and `Imported or updated: 29` for the current local export. If the local database is not running, start it with `corepack pnpm db:up` from the repo root, run the web Prisma migration, and rerun the import.

- [ ] **Step 8: Commit import script**

Run:

```bash
git add apps/web/src/server/auth apps/web/scripts/import-kinde-users.ts apps/web/tests/server/kindeExport.test.ts apps/web/package.json
git commit -m "feat: 导入 Kinde 导出用户"
```

Expected: commit succeeds. `kinde_export/` remains ignored.

---

### Task 11: Mobile Auth Provider And Bearer Requests

**Files:**
- Create: `apps/mobile/src/features/auth/mobileAuthToken.ts`
- Create: `apps/mobile/src/features/auth/MobileAuthProvider.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: `apps/mobile/src/lib/api.ts`
- Test: `apps/mobile/__tests__/mobile-auth-api.test.ts`
- Modify: `apps/mobile/__tests__/mobile-routes.test.tsx`

- [ ] **Step 1: Write failing Mobile API auth tests**

Create `apps/mobile/__tests__/mobile-auth-api.test.ts`:

```ts
import { apiGetJson } from "@/lib/api";
import {
  clearMobileAccessTokenGetter,
  setMobileAccessTokenGetter,
} from "@/features/auth/mobileAuthToken";

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
  });

  it("adds a bearer token to every request", async () => {
    setMobileAccessTokenGetter(async () => "access-token-1");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await expect(apiGetJson("/api/public/boards")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith("https://web.example.com/api/public/boards", {
      headers: {
        Authorization: "Bearer access-token-1",
      },
    });
  });

  it("throws before fetch when authenticated token is missing", async () => {
    await expect(apiGetJson("/api/public/boards")).rejects.toThrow(
      "Missing mobile authentication token",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the existing missing base URL error", async () => {
    delete process.env.EXPO_PUBLIC_WEB_BASE_URL;
    setMobileAccessTokenGetter(async () => "access-token-1");

    await expect(apiGetJson("/api/public/boards")).rejects.toThrow(
      "Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run API auth tests and verify failure**

Run:

```bash
corepack pnpm --filter @bbs/mobile test -- mobile-auth-api.test.ts
```

Expected: FAIL with module resolution error for `@/features/auth/mobileAuthToken`.

- [ ] **Step 3: Implement Mobile token store**

Create `apps/mobile/src/features/auth/mobileAuthToken.ts`:

```ts
type AccessTokenGetter = () => Promise<string | null>;

let accessTokenGetter: AccessTokenGetter | null = null;

export function setMobileAccessTokenGetter(getter: AccessTokenGetter) {
  accessTokenGetter = getter;
}

export function clearMobileAccessTokenGetter() {
  accessTokenGetter = null;
}

export async function getMobileAccessToken() {
  return accessTokenGetter ? accessTokenGetter() : null;
}
```

- [ ] **Step 4: Attach bearer token in API client**

Modify `apps/mobile/src/lib/api.ts`:

```ts
import { getMobileAccessToken } from "@/features/auth/mobileAuthToken";

function getWebBaseUrl() {
  const value = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim();

  if (!value) {
    throw new Error("Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API");
  }

  return value.replace(/\/$/, "");
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const baseUrl = getWebBaseUrl();
  const accessToken = await getMobileAccessToken();

  if (!accessToken) {
    throw new Error("Missing mobile authentication token");
  }

  const response = await fetch(`${baseUrl}${path}`, {
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
```

- [ ] **Step 5: Run API auth tests and verify pass**

Run:

```bash
corepack pnpm --filter @bbs/mobile test -- mobile-auth-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Mock authenticated token in existing mobile route tests**

Modify `apps/mobile/__tests__/mobile-routes.test.tsx` imports:

```ts
import {
  clearMobileAccessTokenGetter,
  setMobileAccessTokenGetter,
} from "@/features/auth/mobileAuthToken";
```

In `beforeEach`, add:

```ts
    setMobileAccessTokenGetter(async () => "route-test-token");
```

In `afterAll`, add:

```ts
    clearMobileAccessTokenGetter();
```

Update fetch expectations from:

```ts
expect(fetchMock).toHaveBeenCalledWith("https://web.example.com/api/public/boards");
```

to:

```ts
expect(fetchMock).toHaveBeenCalledWith("https://web.example.com/api/public/boards", {
  headers: { Authorization: "Bearer route-test-token" },
});
```

For `toHaveBeenNthCalledWith`, add the same second argument:

```ts
{
  headers: { Authorization: "Bearer route-test-token" },
}
```

- [ ] **Step 7: Implement Mobile Kinde provider**

Create `apps/mobile/src/features/auth/MobileAuthProvider.tsx`:

```tsx
import { KindeAuthProvider, useKindeAuth } from "@kinde/expo";
import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  clearMobileAccessTokenGetter,
  setMobileAccessTokenGetter,
} from "./mobileAuthToken";

function getRequiredPublicEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required mobile auth environment variable: ${name}`);
  }
  return value;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const kinde = useKindeAuth();
  const redirectURL = getRequiredPublicEnv("EXPO_PUBLIC_KINDE_REDIRECT_URL");
  const audience = getRequiredPublicEnv("EXPO_PUBLIC_KINDE_API_AUDIENCE");

  useEffect(() => {
    if (!kinde.isAuthenticated) {
      clearMobileAccessTokenGetter();
      return;
    }

    setMobileAccessTokenGetter(kinde.getAccessToken);
    return () => clearMobileAccessTokenGetter();
  }, [kinde]);

  if (kinde.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>正在检查登录状态</Text>
      </View>
    );
  }

  if (!kinde.isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>BBSAchieve</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => {
            void kinde.login({ audience, redirectURL });
          }}
        >
          <Text style={styles.primaryButtonText}>登录</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.secondaryButton}
          onPress={() => {
            void kinde.register({ audience, redirectURL });
          }}
        >
          <Text style={styles.secondaryButtonText}>注册</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo(
    () => ({
      domain: getRequiredPublicEnv("EXPO_PUBLIC_KINDE_DOMAIN"),
      clientId: getRequiredPublicEnv("EXPO_PUBLIC_KINDE_CLIENT_ID"),
      scopes: "openid profile email offline",
    }),
    [],
  );

  return (
    <KindeAuthProvider config={config}>
      <AuthGate>{children}</AuthGate>
    </KindeAuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  muted: {
    color: "#52525b",
  },
  primaryButton: {
    minWidth: 160,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#18181b",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    minWidth: 160,
    alignItems: "center",
    borderRadius: 8,
    borderColor: "#d4d4d8",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: "#18181b",
    fontWeight: "600",
  },
});
```

- [ ] **Step 8: Wrap Mobile root layout**

Modify `apps/mobile/src/app/_layout.tsx`:

```tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { MobileAuthProvider } from '@/features/auth/MobileAuthProvider';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <MobileAuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="boards/[boardId]" options={{ title: '版面帖子' }} />
          <Stack.Screen name="threads/[threadId]" options={{ title: '帖子详情' }} />
          <Stack.Screen name="inbox-binding" options={{ title: '通知与绑定入口' }} />
        </Stack>
      </ThemeProvider>
    </MobileAuthProvider>
  );
}
```

- [ ] **Step 9: Mock Kinde provider for route tests**

At the top of `apps/mobile/__tests__/mobile-routes.test.tsx`, add:

```ts
jest.mock("@kinde/expo", () => ({
  KindeAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKindeAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    getAccessToken: async () => "route-test-token",
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  }),
}));
```

- [ ] **Step 10: Run mobile tests**

Run:

```bash
corepack pnpm --filter @bbs/mobile test
```

Expected: PASS.

- [ ] **Step 11: Commit Mobile auth**

Run:

```bash
git add apps/mobile/src/features/auth apps/mobile/src/app/_layout.tsx apps/mobile/src/lib/api.ts apps/mobile/__tests__/mobile-auth-api.test.ts apps/mobile/__tests__/mobile-routes.test.tsx apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat: 移动端接入 Kinde 登录"
```

Expected: commit succeeds.

---

### Task 12: Full Verification And Final Cleanup

**Files:**
- Inspect: all modified files
- No planned new files

- [ ] **Step 1: Run Web targeted tests**

Run:

```bash
corepack pnpm --filter @bbs/web exec vitest run \
  tests/server/auth-env.test.ts \
  tests/server/auth-identity.test.ts \
  tests/server/localHumanUser.test.ts \
  tests/server/kindeJwt.test.ts \
  tests/server/kindeExport.test.ts \
  tests/public-api-routes.test.ts \
  tests/public-routes.test.tsx \
  tests/admin-import-job-routes.test.ts \
  tests/admin-imports-route.test.ts \
  tests/admin-scheduled-tasks-route.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run Web typecheck**

Run:

```bash
corepack pnpm --filter @bbs/web typecheck
```

Expected: PASS.

- [ ] **Step 3: Run Mobile tests and typecheck**

Run:

```bash
corepack pnpm --filter @bbs/mobile test
corepack pnpm --filter @bbs/mobile typecheck
```

Expected: PASS.

- [ ] **Step 4: Run repository test suite**

Run:

```bash
corepack pnpm test
```

Expected: PASS.

- [ ] **Step 5: Verify secret and export data are not staged**

Run:

```bash
git status --short
git check-ignore apps/web/.env apps/mobile/.env kinde_export/users.ndjson kinde_export/organizations.ndjson
```

Expected: `git status --short` shows no `.env` files and no `kinde_export/`. `git check-ignore` prints all four ignored paths.

- [ ] **Step 6: Review final diff**

Run:

```bash
git diff --stat HEAD
git diff --name-only HEAD
```

Expected: only intended auth, mobile, Prisma, package, and test files appear.

- [ ] **Step 7: Commit final cleanup if needed**

If Step 6 reveals small uncommitted fixes from verification, commit the specific files shown by `git diff --name-only HEAD`, for example:

```bash
git add apps/web/src/server/auth/index.ts apps/web/tests/server/auth-identity.test.ts
git commit -m "test: 补齐 Kinde 认证验证"
```

Expected: commit succeeds, or no commit is needed because all task commits already captured the work.

---

## Self-Review

Spec coverage:

- Web public/guarded boundaries are covered by Tasks 7 and 8.
- Admin organization guard is covered by Tasks 6, 7, and 9.
- Mobile global login and bearer requests are covered by Task 11.
- Local `User + HumanProfile` lazy upsert is covered by Task 4.
- Kinde export import script is covered by Task 10.
- `kinde_export/` ignore rules are covered by Task 1.
- Webhook is explicitly not implemented, matching the design.

Placeholder scan:

- No unresolved placeholder steps remain in this plan.

Type consistency:

- Shared identity type is `KindeIdentity`.
- Route guard result is consistently `ok: true` or `ok: false`.
- Mobile token functions are consistently `setMobileAccessTokenGetter`, `clearMobileAccessTokenGetter`, and `getMobileAccessToken`.
- API audience env uses local `KINDE_API_AUDIENCE` and SDK-compatible `KINDE_AUDIENCE`.
