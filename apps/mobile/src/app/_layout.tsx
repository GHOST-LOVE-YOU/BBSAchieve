import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import React from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { MobileAuthProvider } from '@/features/auth/MobileAuthProvider';

type StackHeaderProps = {
  back?: unknown;
  navigation: {
    canGoBack?: () => boolean;
    goBack: () => void;
  };
  options: {
    title?: string;
    headerTitle?: unknown;
  };
  route: {
    name: string;
  };
};

function AppStackHeader({ back, navigation, options, route }: StackHeaderProps) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const canGoBack = Boolean(back) || navigation.canGoBack?.();
  const headerTitle = typeof options.headerTitle === 'string'
    ? options.headerTitle
    : options.title ?? route.name;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.canvas,
          borderBottomColor: colors.hairlineSoft,
          paddingTop: insets.top + 6,
        },
      ]}>
      <View style={styles.headerSide}>
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            android_ripple={{ color: 'transparent', borderless: true }}
            hitSlop={8}
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <View style={styles.backIcon}>
              <View style={[styles.backLineTop, { backgroundColor: colors.primary }]} />
              <View style={[styles.backLineBottom, { backgroundColor: colors.primary }]} />
            </View>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.headerTitle, { color: colors.ink }]} numberOfLines={1}>
        {headerTitle}
      </Text>
      <View style={styles.headerSide} />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.canvas,
      card: colors.surface,
      text: colors.ink,
      primary: colors.primary,
      border: colors.hairline,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <MobileAuthProvider>
        <Stack
          screenOptions={{
            header: (props) => <AppStackHeader {...props} />,
            contentStyle: { backgroundColor: colors.canvas },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="boards/[boardId]" options={{ title: '版面' }} />
          <Stack.Screen name="threads/[threadId]" options={{ title: '帖子详情' }} />
          <Stack.Screen name="browse/index" options={{ title: '浏览分区' }} />
          <Stack.Screen name="browse/[sectionId]" options={{ title: '分区详情' }} />
          <Stack.Screen name="users/[userId]" options={{ title: '用户' }} />
          <Stack.Screen name="inbox-binding" options={{ title: '通知订阅' }} />
          <Stack.Screen
            name="search"
            options={{ headerShown: false, presentation: 'modal' }}
          />
        </Stack>
      </MobileAuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerSide: {
    width: 48,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  backIcon: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  backLineTop: {
    position: 'absolute',
    left: 3,
    top: 4,
    width: 11,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  backLineBottom: {
    position: 'absolute',
    left: 3,
    bottom: 4,
    width: 11,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});
