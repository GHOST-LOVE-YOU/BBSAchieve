export type MobilePublicEnv = {
  disableAuth?: string;
  kindeApiAudience?: string;
  kindeClientId?: string;
  kindeDomain?: string;
  kindeRedirectUrl?: string;
  webBaseUrl?: string;
};

export type MobileAuthSetupIssue = {
  title: string;
  message: string;
  missingNames: string[];
};

const missingWebBaseUrlMessage = "Missing EXPO_PUBLIC_WEB_BASE_URL";
const requiredKindeEnvFields: readonly {
  key: keyof MobilePublicEnv;
  name: string;
}[] = [
  { key: "kindeDomain", name: "EXPO_PUBLIC_KINDE_DOMAIN" },
  { key: "kindeClientId", name: "EXPO_PUBLIC_KINDE_CLIENT_ID" },
  { key: "kindeApiAudience", name: "EXPO_PUBLIC_KINDE_API_AUDIENCE" },
  { key: "kindeRedirectUrl", name: "EXPO_PUBLIC_KINDE_REDIRECT_URL" },
];

export function getMobilePublicEnv(): MobilePublicEnv {
  return {
    disableAuth: process.env.EXPO_PUBLIC_DISABLE_AUTH,
    kindeApiAudience: process.env.EXPO_PUBLIC_KINDE_API_AUDIENCE,
    kindeClientId: process.env.EXPO_PUBLIC_KINDE_CLIENT_ID,
    kindeDomain: process.env.EXPO_PUBLIC_KINDE_DOMAIN,
    kindeRedirectUrl: process.env.EXPO_PUBLIC_KINDE_REDIRECT_URL,
    webBaseUrl: process.env.EXPO_PUBLIC_WEB_BASE_URL,
  };
}

function requireEnvValue(name: string, value: string | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    throw new Error(`Missing ${name}`);
  }
  return trimmedValue;
}

export function isMobileAuthDisabled(env: MobilePublicEnv = getMobilePublicEnv()) {
  return env.disableAuth?.trim().toLowerCase() === "true";
}

export function getRequiredWebBaseUrl(
  env: MobilePublicEnv = getMobilePublicEnv(),
  message = missingWebBaseUrlMessage,
) {
  const value = env.webBaseUrl?.trim();

  if (!value) {
    throw new Error(message);
  }

  return value.replace(/\/$/, "");
}

export function getMobileAuthSetupIssue(
  env: MobilePublicEnv = getMobilePublicEnv(),
): MobileAuthSetupIssue | null {
  const missingNames = requiredKindeEnvFields
    .filter(({ key }) => !env[key]?.trim())
    .map(({ name }) => name);

  if (missingNames.length === 0) {
    return null;
  }

  return {
    title: "移动端登录配置缺失",
    message: `当前构建缺少 ${missingNames.join("、")}。请在 EAS 对应构建环境配置这些 EXPO_PUBLIC_ 变量后重新打包。`,
    missingNames,
  };
}

export function getMobileKindeLoginOptions(env: MobilePublicEnv = getMobilePublicEnv()) {
  return {
    audience: requireEnvValue(
      "EXPO_PUBLIC_KINDE_API_AUDIENCE",
      env.kindeApiAudience,
    ),
    redirectURL: requireEnvValue(
      "EXPO_PUBLIC_KINDE_REDIRECT_URL",
      env.kindeRedirectUrl,
    ),
  };
}

export function getMobileKindeProviderConfig(env: MobilePublicEnv = getMobilePublicEnv()) {
  return {
    domain: requireEnvValue("EXPO_PUBLIC_KINDE_DOMAIN", env.kindeDomain),
    clientId: requireEnvValue(
      "EXPO_PUBLIC_KINDE_CLIENT_ID",
      env.kindeClientId,
    ),
    scopes: "openid profile email offline",
  };
}
