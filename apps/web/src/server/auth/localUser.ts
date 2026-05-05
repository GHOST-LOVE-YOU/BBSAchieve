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
