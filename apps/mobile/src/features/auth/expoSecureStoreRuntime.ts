import { NativeModules } from "react-native";

type ExpoSecureStoreRuntimeState = {
  expoModules?: Record<string, unknown> | null;
  legacyNativeProxy?: {
    exportedMethods?: Record<string, unknown> | null;
    modulesConstants?: Record<string, unknown> | null;
  } | null;
};

type ExpoSecureStoreRuntimeIssue = {
  title: string;
  message: string;
};

const secureStoreModuleName = "ExpoSecureStore";

type GlobalWithExpoModules = typeof globalThis & {
  expo?: {
    modules?: Record<string, unknown> | null;
  };
};

type NativeModulesWithExpoProxy = typeof NativeModules & {
  NativeUnimoduleProxy?: ExpoSecureStoreRuntimeState["legacyNativeProxy"];
};

export function getExpoSecureStoreRuntimeIssue({
  expoModules,
  legacyNativeProxy,
}: ExpoSecureStoreRuntimeState): ExpoSecureStoreRuntimeIssue | null {
  if (expoModules?.[secureStoreModuleName]) {
    return null;
  }

  const legacyMethods = legacyNativeProxy?.exportedMethods;
  const legacyConstants = legacyNativeProxy?.modulesConstants;

  if (legacyMethods?.[secureStoreModuleName] && legacyConstants?.[secureStoreModuleName]) {
    return null;
  }

  if (legacyMethods?.[secureStoreModuleName] && !legacyConstants) {
    return {
      title: "Expo Go 需要更新",
      message:
        "当前 Expo Go 的原生模块桥与 Expo SDK 55 不匹配。请更新或重装 Expo Go，或改用 development build。",
    };
  }

  return {
    title: "缺少 SecureStore 原生模块",
    message:
      "当前运行壳没有注册 ExpoSecureStore。请更新 Expo Go，或使用包含 expo-secure-store 的 development build。",
  };
}

export function getCurrentExpoSecureStoreRuntimeIssue() {
  const expoModules = (globalThis as GlobalWithExpoModules).expo?.modules;
  const legacyNativeProxy = (NativeModules as NativeModulesWithExpoProxy).NativeUnimoduleProxy;

  return getExpoSecureStoreRuntimeIssue({ expoModules, legacyNativeProxy });
}
