import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <BottomBar>
          <TabTrigger name="home" href="/" asChild>
            <TabBtn icon="🏠" label="首页" />
          </TabTrigger>
          <TabTrigger name="favorites" href="/favorites" asChild>
            <TabBtn icon="⭐" label="收藏" />
          </TabTrigger>
          <TabTrigger name="notifications" href="/notifications" asChild>
            <TabBtn icon="🔔" label="通知" />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabBtn icon="👤" label="我" />
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

function TabBtn({
  children: _,
  isFocused,
  icon,
  label,
  ...props
}: TabTriggerSlotProps & { icon: string; label: string }) {
  const theme = useTheme();
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabBtn, pressed && styles.pressed]}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text
        style={[
          styles.tabLabel,
          { color: isFocused ? theme.primary : theme.ash },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BottomBar(props: TabListProps) {
  const theme = useTheme();
  return (
    <View
      {...props}
      style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.hairline }]}>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
});
