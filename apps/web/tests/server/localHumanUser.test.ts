import { describe, expect, it, vi } from "vitest";

import type { KindeIdentity } from "@/src/server/auth/identity";
import { ensureLocalHumanUser } from "@/src/server/auth/localUser";

function createPrismaMock(existingProfile: unknown = null) {
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

    await ensureLocalHumanUser(prisma as never, identity);

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

    const result = await ensureLocalHumanUser(prisma as never, identity);

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
