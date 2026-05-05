import { describe, expect, it } from "vitest";
import path from "node:path";

import {
  identityFromKindeExportUser,
  parseKindeExportUserLine,
  resolveKindeUsersExportPath,
} from "@/src/server/auth/kindeExport";

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
    expect(() => parseKindeExportUserLine("{")).toThrow(
      "Invalid Kinde export JSON",
    );
    expect(() =>
      identityFromKindeExportUser({ email: "missing-id@example.com" }),
    ).toThrow("Kinde export user is missing id");
  });

  it("ignores the pnpm argument separator when resolving import paths", () => {
    expect(
      resolveKindeUsersExportPath(["--", "../../kinde_export/users.ndjson"], {
        cwd: "/repo/apps/web",
      }),
    ).toBe(path.resolve("/repo/apps/web", "../../kinde_export/users.ndjson"));
  });
});
