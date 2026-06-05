import { getExpoSecureStoreRuntimeIssue } from "@/features/auth/expoSecureStoreRuntime";
import { render, screen } from "@testing-library/react-native";
import { NativeModules } from "react-native";

import { MobileAuthProvider } from "@/features/auth/MobileAuthProvider";

describe("Expo SecureStore runtime detection", () => {
  const originalExpo = (globalThis as { expo?: unknown }).expo;
  const originalNativeUnimoduleProxy = NativeModules.NativeUnimoduleProxy;

  function setNativeUnimoduleProxy(value: unknown) {
    Object.defineProperty(NativeModules, "NativeUnimoduleProxy", {
      configurable: true,
      value,
      writable: true,
    });
  }

  afterEach(() => {
    (globalThis as { expo?: unknown }).expo = originalExpo;
    setNativeUnimoduleProxy(originalNativeUnimoduleProxy);
  });

  it("allows startup when ExpoSecureStore is registered through Expo modules", () => {
    expect(
      getExpoSecureStoreRuntimeIssue({
        expoModules: {
          ExpoSecureStore: {},
        },
      }),
    ).toBeNull();
  });

  it("allows startup when ExpoSecureStore is available through the legacy proxy", () => {
    expect(
      getExpoSecureStoreRuntimeIssue({
        legacyNativeProxy: {
          exportedMethods: {
            ExpoSecureStore: [],
          },
          modulesConstants: {
            ExpoSecureStore: {},
          },
        },
      }),
    ).toBeNull();
  });

  it("reports an outdated Expo Go bridge before Kinde imports SecureStore", () => {
    expect(
      getExpoSecureStoreRuntimeIssue({
        legacyNativeProxy: {
          exportedMethods: {
            ExpoSecureStore: [],
          },
        },
      }),
    ).toEqual({
      title: "Expo Go 需要更新",
      message:
        "当前 Expo Go 的原生模块桥与 Expo SDK 55 不匹配。请更新或重装 Expo Go，或改用 development build。",
    });
  });

  it("reports when the current native runtime does not include ExpoSecureStore", () => {
    expect(getExpoSecureStoreRuntimeIssue({})).toEqual({
      title: "缺少 SecureStore 原生模块",
      message:
        "当前运行壳没有注册 ExpoSecureStore。请更新 Expo Go，或使用包含 expo-secure-store 的 development build。",
    });
  });

  it("shows an actionable runtime message instead of mounting Kinde on an outdated Expo Go bridge", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (globalThis as { expo?: unknown }).expo = undefined;
    setNativeUnimoduleProxy({
      exportedMethods: {
        ExpoSecureStore: [],
      },
    });

    render(<MobileAuthProvider>Ready</MobileAuthProvider>);

    expect(screen.getByText("Expo Go 需要更新")).toBeTruthy();
    expect(screen.getByText(/原生模块桥与 Expo SDK 55 不匹配/)).toBeTruthy();
    expect(screen.queryByText("Ready")).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "Kinde SecureStore runtime unavailable:",
      expect.objectContaining({ title: "Expo Go 需要更新" }),
    );
    errorSpy.mockRestore();
  });

  it("shows an actionable setup message instead of crashing when Kinde env is missing", () => {
    const originalDomain = process.env.EXPO_PUBLIC_KINDE_DOMAIN;
    const originalClientId = process.env.EXPO_PUBLIC_KINDE_CLIENT_ID;
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (globalThis as { expo?: unknown }).expo = {
      modules: { ExpoSecureStore: {} },
    };
    delete process.env.EXPO_PUBLIC_KINDE_DOMAIN;
    delete process.env.EXPO_PUBLIC_KINDE_CLIENT_ID;

    try {
      render(<MobileAuthProvider>Ready</MobileAuthProvider>);

      expect(screen.getByText("移动端登录配置缺失")).toBeTruthy();
      expect(screen.getByText(/EXPO_PUBLIC_KINDE_DOMAIN/)).toBeTruthy();
      expect(screen.queryByText("Ready")).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        "Mobile Kinde environment unavailable:",
        expect.objectContaining({
          title: "移动端登录配置缺失",
          missingNames: expect.arrayContaining([
            "EXPO_PUBLIC_KINDE_DOMAIN",
            "EXPO_PUBLIC_KINDE_CLIENT_ID",
          ]),
        }),
      );
    } finally {
      process.env.EXPO_PUBLIC_KINDE_DOMAIN = originalDomain;
      process.env.EXPO_PUBLIC_KINDE_CLIENT_ID = originalClientId;
      errorSpy.mockRestore();
    }
  });
});
