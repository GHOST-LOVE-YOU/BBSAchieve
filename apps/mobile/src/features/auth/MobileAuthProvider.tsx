import { KindeAuthProvider, useKindeAuth } from "@kinde/expo";
import type { KindeAuthHook } from "@kinde/expo";
import React, { useLayoutEffect } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";

import {
  clearMobileAccessTokenGetter,
  setMobileAccessTokenGetter,
} from "./mobileAuthToken";

type MobileAuthGateProps = {
  children: React.ReactNode;
};

type PublicEnv = Record<string, string | undefined>;

function requirePublicEnv(name: string, env: PublicEnv = process.env) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getMobileKindeLoginOptions(env: PublicEnv = process.env) {
  return {
    audience: requirePublicEnv("EXPO_PUBLIC_KINDE_API_AUDIENCE", env),
    redirectURL: requirePublicEnv("EXPO_PUBLIC_KINDE_REDIRECT_URL", env),
  };
}

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
  return (
    <KindeAuthProvider
      config={{
        domain: requirePublicEnv("EXPO_PUBLIC_KINDE_DOMAIN"),
        clientId: requirePublicEnv("EXPO_PUBLIC_KINDE_CLIENT_ID"),
        scopes: "openid profile email offline",
      }}
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
});
