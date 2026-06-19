import { useEffect, useRef, useState } from 'react';
import { ColorValue, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchNotifications } from '@/features/reading/client';
import { useTheme } from '@/hooks/use-theme';

export type BottomTabKey = 'home' | 'favorites' | 'notifications' | 'profile';

export const MOBILE_TABBAR_HEIGHT = 74;
export const MOBILE_TABBAR_BOTTOM_PAD = 20;
export const MOBILE_TABBAR_SCROLL_GAP = MOBILE_TABBAR_HEIGHT + MOBILE_TABBAR_BOTTOM_PAD + 8;

type TabGlyph = 'home' | 'bookmark' | 'bell' | 'user';

const TABS: { key: BottomTabKey; label: string; glyph: TabGlyph }[] = [
  { key: 'home', label: '首页', glyph: 'home' },
  { key: 'favorites', label: '收藏', glyph: 'bookmark' },
  { key: 'notifications', label: '通知', glyph: 'bell' },
  { key: 'profile', label: '我', glyph: 'user' },
];

export function BottomTabGlyph({
  badgeCount = 0,
  color,
  focused,
  glyph,
}: {
  badgeCount?: number;
  color: ColorValue;
  focused: boolean;
  glyph: TabGlyph;
}) {
  const theme = useTheme();
  const iconColor = focused ? theme.ink : color;

  return (
    <View style={styles.glyphWrap}>
      {glyph === 'home' ? (
        <HomeIcon color={iconColor} />
      ) : glyph === 'bookmark' ? (
        <BookmarkIcon color={iconColor} />
      ) : glyph === 'bell' ? (
        <BellIcon color={iconColor} />
      ) : glyph === 'user' ? (
        <UserIcon color={iconColor} />
      ) : (
        <Text style={[styles.glyph, { color: iconColor }]}>{glyph}</Text>
      )}
      {badgeCount > 0 ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.error, borderColor: theme.canvas },
          ]}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function FloatingBottomTabs({
  active,
  notificationCount,
  onPress,
}: {
  active: BottomTabKey;
  notificationCount?: number;
  onPress: (key: BottomTabKey) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [resolvedNotificationCount, setResolvedNotificationCount] = useState(notificationCount ?? 0);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;

    if (notificationCount != null) {
      setResolvedNotificationCount(notificationCount);
      return;
    }

    let activeRequest = true;
    fetchNotifications('all', 1, 1)
      .then((res) => {
        if (activeRequest && requestVersionRef.current === requestVersion) {
          setResolvedNotificationCount(res.unreadCount);
        }
      })
      .catch(() => {
        if (activeRequest && requestVersionRef.current === requestVersion) {
          setResolvedNotificationCount(0);
        }
      });

    return () => {
      activeRequest = false;
    };
  }, [notificationCount]);

  return (
    <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: theme.canvasTranslucent,
            borderTopColor: theme.hairlineSoft,
            height: MOBILE_TABBAR_HEIGHT + insets.bottom,
            paddingBottom: MOBILE_TABBAR_BOTTOM_PAD + insets.bottom,
          },
        ]}>
      {TABS.map((tab) => {
        const focused = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            android_ripple={{ color: 'transparent', borderless: true }}
            onPress={() => onPress(tab.key)}
            style={styles.floatingItem}>
            <BottomTabGlyph
              badgeCount={tab.key === 'notifications' ? resolvedNotificationCount : 0}
              color={focused ? theme.ink : theme.inkTertiary}
              focused={focused}
              glyph={tab.glyph}
            />
            <Text
              style={[
                styles.label,
                { color: focused ? theme.ink : theme.inkTertiary },
              ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BookmarkIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.bookmarkIcon}>
      <View style={[styles.bookmarkBody, { borderColor: color }]} />
      <View style={[styles.bookmarkCutLeft, { backgroundColor: color }]} />
      <View style={[styles.bookmarkCutRight, { backgroundColor: color }]} />
    </View>
  );
}

function HomeIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.homeIcon}>
      <View style={[styles.homeRoofLeft, { backgroundColor: color }]} />
      <View style={[styles.homeRoofRight, { backgroundColor: color }]} />
      <View style={[styles.homeBody, { borderColor: color }]} />
    </View>
  );
}

function BellIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.bellIcon}>
      <View style={[styles.bellDome, { borderColor: color }]} />
      <View style={[styles.bellBase, { backgroundColor: color }]} />
      <View style={[styles.bellClapper, { backgroundColor: color }]} />
    </View>
  );
}

function UserIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.userIcon}>
      <View style={[styles.userHead, { borderColor: color }]} />
      <View style={[styles.userShoulders, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 0,
    shadowOpacity: 0,
  },
  floatingItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 5,
  },
  glyphWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glyph: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 22,
  },
  homeIcon: {
    width: 21,
    height: 21,
    position: 'relative',
  },
  homeRoofLeft: {
    position: 'absolute',
    left: 3,
    top: 6,
    width: 10,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '-42deg' }],
  },
  homeRoofRight: {
    position: 'absolute',
    right: 3,
    top: 6,
    width: 10,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '42deg' }],
  },
  homeBody: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 1,
    height: 11,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  bookmarkIcon: {
    width: 18,
    height: 20,
    position: 'relative',
  },
  bookmarkBody: {
    position: 'absolute',
    top: 2,
    left: 3,
    width: 12,
    height: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderRadius: 2,
  },
  bookmarkCutLeft: {
    position: 'absolute',
    left: 4,
    bottom: 2,
    width: 8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '32deg' }],
  },
  bookmarkCutRight: {
    position: 'absolute',
    right: 4,
    bottom: 2,
    width: 8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '-32deg' }],
  },
  bellIcon: {
    width: 20,
    height: 21,
    position: 'relative',
  },
  bellDome: {
    position: 'absolute',
    top: 3,
    left: 4,
    width: 12,
    height: 13,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  bellBase: {
    position: 'absolute',
    left: 3,
    bottom: 4,
    width: 14,
    height: 2,
    borderRadius: 2,
  },
  bellClapper: {
    position: 'absolute',
    left: 8,
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 4,
  },
  userIcon: {
    width: 20,
    height: 21,
    alignItems: 'center',
    position: 'relative',
  },
  userHead: {
    width: 8,
    height: 8,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 2,
  },
  userShoulders: {
    position: 'absolute',
    left: 3,
    bottom: 1,
    width: 14,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 11,
  },
});
