import { useKindeAuth } from "@kinde/expo";
import type { KindeAuthHook } from "@kinde/expo";

import { isMobileAuthDisabled } from "./MobileAuthProvider";

export type MobileAuthHook = Pick<
  KindeAuthHook,
  | "isAuthenticated"
  | "isLoading"
  | "login"
  | "logout"
  | "getAccessToken"
  | "getUserProfile"
>;

const STUB_USER_PROFILE = {
  id: "dev-user",
  givenName: "Dev",
  familyName: "User",
  email: "dev@local",
  picture: "",
} as unknown as Awaited<ReturnType<KindeAuthHook["getUserProfile"]>>;

const STUB_HOOK: MobileAuthHook = {
  isAuthenticated: true,
  isLoading: false,
  login: async () => ({} as Awaited<ReturnType<KindeAuthHook["login"]>>),
  logout: async () => ({} as Awaited<ReturnType<KindeAuthHook["logout"]>>),
  getAccessToken: async () => null,
  getUserProfile: async () => STUB_USER_PROFILE,
};

function useStubMobileAuth(): MobileAuthHook {
  return STUB_HOOK;
}

function useKindeMobileAuth(): MobileAuthHook {
  return useKindeAuth();
}

export const useMobileAuth: () => MobileAuthHook = isMobileAuthDisabled()
  ? useStubMobileAuth
  : useKindeMobileAuth;
