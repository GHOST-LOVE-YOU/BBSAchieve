import { KindeAuthProvider, useKindeAuth } from "@kinde/expo";
import type { KindeAuthHook } from "@kinde/expo";
import React, { useLayoutEffect } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";

import {
  getMobileAuthSetupIssue,
  getMobileKindeLoginOptions,
  getMobileKindeProviderConfig,
  isMobileAuthDisabled,
} from "@/config/env";

import { getCurrentExpoSecureStoreRuntimeIssue } from "./expoSecureStoreRuntime";
import {
  clearMobileAccessTokenGetter,
  setMobileAccessTokenGetter,
} from "./mobileAuthToken";

type MobileAuthGateProps = {
  children: React.ReactNode;
};

function loginWithApiAudience(login: KindeAuthHook["login"]) {
  return login(getMobileKindeLoginOptions());
}

function MobileAuthGate({ children }: MobileAuthGateProps) {
  const auth = useKindeAuth();

  useLayoutEffect(() => {
    if (!auth.isAuthenticated) {
      clearMobileAccessTokenGetter();
      return;
    }

    setMobileAccessTokenGetter(auth.getAccessToken);
    return () => {
      clearMobileAccessTokenGetter();
    };
  }, [auth.getAccessToken, auth.isAuthenticated]);

  if (auth.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>登录后继续</Text>
        <Button title="登录 / 注册" onPress={() => void loginWithApiAudience(auth.login)} />
      </View>
    );
  }

  return <>{children}</>;
}

export function MobileAuthProvider({ children }: MobileAuthGateProps) {
  if (isMobileAuthDisabled()) {
    if (__DEV__) {
      console.warn("EXPO_PUBLIC_DISABLE_AUTH is enabled — bypassing Kinde authentication");
    }
    return <>{children}</>;
  }

  const secureStoreRuntimeIssue = getCurrentExpoSecureStoreRuntimeIssue();

  if (secureStoreRuntimeIssue) {
    if (__DEV__) {
      console.error("Kinde SecureStore runtime unavailable:", secureStoreRuntimeIssue);
    }

    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{secureStoreRuntimeIssue.title}</Text>
        <Text style={styles.message}>{secureStoreRuntimeIssue.message}</Text>
      </View>
    );
  }

  const setupIssue = getMobileAuthSetupIssue();

  if (setupIssue) {
    if (__DEV__) {
      console.error("Mobile Kinde environment unavailable:", setupIssue);
    }

    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{setupIssue.title}</Text>
        <Text style={styles.message}>{setupIssue.message}</Text>
      </View>
    );
  }

  return (
    <KindeAuthProvider
      config={getMobileKindeProviderConfig()}
    >
      <MobileAuthGate>{children}</MobileAuthGate>
    </KindeAuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
