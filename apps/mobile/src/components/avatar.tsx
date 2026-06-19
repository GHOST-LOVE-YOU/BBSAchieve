import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  name: string;
  size?: number;
  color?: string;
};

export function Avatar({ name, size = 36, color }: Props) {
  const theme = useTheme();
  const bg = color ?? theme.surfaceSky;
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { fontSize: size * 0.42, color: theme.ink }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
