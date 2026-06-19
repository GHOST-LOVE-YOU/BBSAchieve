import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomTabGlyph,
  MOBILE_TABBAR_BOTTOM_PAD,
  MOBILE_TABBAR_HEIGHT,
} from '@/components/bottom-tab-visuals';
import { fetchNotifications } from '@/features/reading/client';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = React.useRef(true);
  const requestVersionRef = React.useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;
    let active = true;

    fetchNotifications('all', 1, 1)
      .then((res) => {
        if (active && mountedRef.current && requestVersionRef.current === requestVersion) {
          setUnreadCount(res.unreadCount);
        }
      })
      .catch(() => {
        if (active && mountedRef.current && requestVersionRef.current === requestVersion) {
          setUnreadCount(0);
        }
      });

    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.ink,
        tabBarInactiveTintColor: theme.inkTertiary,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.bar,
          {
            backgroundColor: theme.canvasTranslucent,
            borderTopColor: theme.hairlineSoft,
            height: MOBILE_TABBAR_HEIGHT + insets.bottom,
            paddingBottom: MOBILE_TABBAR_BOTTOM_PAD + insets.bottom,
          },
        ],
        tabBarItemStyle: styles.item,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color, focused }) => (
            <BottomTabGlyph
              color={color}
              focused={focused}
              glyph="home"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: '收藏',
          tabBarIcon: ({ color, focused }) => (
            <BottomTabGlyph
              color={color}
              focused={focused}
              glyph="bookmark"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color, focused }) => (
            <BottomTabGlyph
              badgeCount={unreadCount}
              color={color}
              focused={focused}
              glyph="bell"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我',
          tabBarIcon: ({ color, focused }) => (
            <BottomTabGlyph
              color={color}
              focused={focused}
              glyph="user"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 10,
    shadowOpacity: 0,
    paddingTop: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
    zIndex: 20,
  },
  item: {
    height: '100%',
    paddingTop: 5,
    paddingBottom: 0,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
  },
});
