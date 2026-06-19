import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PillColor = 'yellow' | 'green' | 'blue' | 'mauve' | 'turquoise' | 'red';

const TAG_KEYS: Record<PillColor, { bg: string; ink: string }> = {
  yellow: { bg: 'tagYellowBg', ink: 'tagYellowInk' },
  green: { bg: 'tagGreenBg', ink: 'tagGreenInk' },
  blue: { bg: 'tagBlueBg', ink: 'tagBlueInk' },
  mauve: { bg: 'tagMauveBg', ink: 'tagMauveInk' },
  turquoise: { bg: 'tagTurquoiseBg', ink: 'tagTurquoiseInk' },
  red: { bg: 'tagRedBg', ink: 'tagRedInk' },
};

type Props = {
  label: string;
  color?: PillColor;
  small?: boolean;
};

export function Pill({ label, color = 'blue', small }: Props) {
  const theme = useTheme();
  const keys = TAG_KEYS[color];
  const bg = (theme as Record<string, string>)[keys.bg];
  const ink = (theme as Record<string, string>)[keys.ink];

  return (
    <View style={[styles.pill, small && styles.pillSmall, { backgroundColor: bg }]}>
      <Text style={[styles.label, small && styles.labelSmall, { color: ink }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.pillLg,
    alignSelf: 'flex-start',
  },
  pillSmall: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
  },
});
