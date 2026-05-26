import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import React from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { MobileAuthProvider } from '@/features/auth/MobileAuthProvider';

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
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="boards/[boardId]" options={{ title: '版面' }} />
          <Stack.Screen name="threads/[threadId]" options={{ title: '帖子详情' }} />
          <Stack.Screen name="browse/index" options={{ title: '浏览分区' }} />
          <Stack.Screen name="browse/[sectionId]" options={{ title: '分区详情' }} />
          <Stack.Screen name="users/[userId]" options={{ title: '用户' }} />
          <Stack.Screen
            name="search"
            options={{ headerShown: false, presentation: 'modal' }}
          />
        </Stack>
      </MobileAuthProvider>
    </ThemeProvider>
  );
}
