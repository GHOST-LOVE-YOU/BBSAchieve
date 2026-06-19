import { KindeAuthProvider, useKindeAuth } from "@kinde/expo";
import type { KindeAuthHook } from "@kinde/expo";
import React, { useEffect, useLayoutEffect } from "react";
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

function AuthSetupIssueScreen({
  issue,
  logPrefix,
}: {
  issue: { title: string; message: string };
  logPrefix: string;
}) {
  useEffect(() => {
    if (__DEV__) {
      console.error(logPrefix, issue);
    }
  }, [issue, logPrefix]);

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>{issue.title}</Text>
      <Text style={styles.message}>{issue.message}</Text>
    </View>
  );
}

export function MobileAuthProvider({ children }: MobileAuthGateProps) {
  if (isMobileAuthDisabled()) {
    return <>{children}</>;
  }

  const secureStoreRuntimeIssue = getCurrentExpoSecureStoreRuntimeIssue();

  if (secureStoreRuntimeIssue) {
    return (
      <AuthSetupIssueScreen
        issue={secureStoreRuntimeIssue}
        logPrefix="Kinde SecureStore runtime unavailable:"
      />
    );
  }

  const setupIssue = getMobileAuthSetupIssue();

  if (setupIssue) {
    return (
      <AuthSetupIssueScreen
        issue={setupIssue}
        logPrefix="Mobile Kinde environment unavailable:"
      />
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
