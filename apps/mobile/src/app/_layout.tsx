import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="boards/[boardId]" options={{ title: '版面帖子' }} />
        <Stack.Screen name="threads/[threadId]" options={{ title: '帖子详情' }} />
        <Stack.Screen name="inbox-binding" options={{ title: '通知与绑定入口' }} />
      </Stack>
    </ThemeProvider>
  );
}
