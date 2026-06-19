import React from 'react';
import { type ColorValue, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon?: string;
  title: string;
  message?: string;
};

export function EmptyState({ icon = '📭', title, message }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <EmptyStateIcon icon={icon} color={theme.inkTertiary} />
      </View>
      <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: theme.inkTertiary }]}>{message}</Text> : null}
    </View>
  );
}

function EmptyStateIcon({ icon, color }: { icon: string; color: ColorValue }) {
  if (icon === '🔔') {
    return (
      <View style={styles.bellIcon}>
        <View style={[styles.bellDome, { borderColor: color }]} />
        <View style={[styles.bellBase, { backgroundColor: color }]} />
        <View style={[styles.bellDot, { backgroundColor: color }]} />
      </View>
    );
  }

  if (icon === '👤') {
    return (
      <View style={styles.userIcon}>
        <View style={[styles.userHead, { borderColor: color }]} />
        <View style={[styles.userShoulders, { borderColor: color }]} />
      </View>
    );
  }

  if (icon === '⚠️') {
    return (
      <View style={styles.warningIcon}>
        <View style={[styles.warningBody, { borderColor: color }]} />
        <View style={[styles.warningMark, { backgroundColor: color }]} />
        <View style={[styles.warningDot, { backgroundColor: color }]} />
      </View>
    );
  }

  if (icon === '📝' || icon === '📋') {
    return (
      <View style={styles.documentIcon}>
        <View style={[styles.documentBody, { borderColor: color }]} />
        <View style={[styles.documentClip, { borderColor: color }]} />
        <View style={[styles.documentLineWide, { backgroundColor: color }]} />
        <View style={[styles.documentLine, { backgroundColor: color }]} />
        <View style={[styles.documentLineShort, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={styles.inboxIcon}>
      <View style={[styles.inboxTray, { borderColor: color }]} />
      <View style={[styles.inboxLid, { borderColor: color }]} />
      <View style={[styles.inboxLine, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  icon: {
    width: 32,
    height: 32,
    marginBottom: Spacing.two,
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  message: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  documentIcon: {
    width: 28,
    height: 32,
    position: 'relative',
  },
  documentBody: {
    position: 'absolute',
    left: 4,
    right: 3,
    top: 5,
    bottom: 1,
    borderWidth: 2,
    borderRadius: 3,
  },
  documentClip: {
    position: 'absolute',
    top: 1,
    left: 9,
    width: 10,
    height: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  documentLineWide: {
    position: 'absolute',
    left: 9,
    top: 14,
    width: 14,
    height: 2,
    borderRadius: 2,
  },
  documentLine: {
    position: 'absolute',
    left: 9,
    top: 20,
    width: 12,
    height: 2,
    borderRadius: 2,
  },
  documentLineShort: {
    position: 'absolute',
    left: 9,
    top: 26,
    width: 8,
    height: 2,
    borderRadius: 2,
  },
  inboxIcon: {
    width: 31,
    height: 28,
    position: 'relative',
  },
  inboxTray: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 1,
    height: 15,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  inboxLid: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 5,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    transform: [{ rotate: '180deg' }],
  },
  inboxLine: {
    position: 'absolute',
    left: 11,
    right: 11,
    top: 16,
    height: 2,
    borderRadius: 2,
  },
  bellIcon: {
    width: 30,
    height: 31,
    position: 'relative',
  },
  bellDome: {
    position: 'absolute',
    top: 5,
    left: 7,
    width: 16,
    height: 17,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  bellBase: {
    position: 'absolute',
    left: 5,
    bottom: 7,
    width: 20,
    height: 2,
    borderRadius: 2,
  },
  bellDot: {
    position: 'absolute',
    left: 13,
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 4,
  },
  userIcon: {
    width: 30,
    height: 31,
    alignItems: 'center',
    position: 'relative',
  },
  userHead: {
    width: 10,
    height: 10,
    borderRadius: 10,
    borderWidth: 2,
    marginTop: 4,
  },
  userShoulders: {
    position: 'absolute',
    left: 5,
    bottom: 3,
    width: 20,
    height: 11,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderWidth: 2,
    borderBottomWidth: 0,
  },
  warningIcon: {
    width: 30,
    height: 30,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBody: {
    position: 'absolute',
    top: 2,
    width: 25,
    height: 25,
    borderWidth: 2,
    borderRadius: 25,
  },
  warningMark: {
    position: 'absolute',
    top: 8,
    width: 2,
    height: 9,
    borderRadius: 2,
  },
  warningDot: {
    position: 'absolute',
    bottom: 7,
    width: 3,
    height: 3,
    borderRadius: 3,
  },
});
