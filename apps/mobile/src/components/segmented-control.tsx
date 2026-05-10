import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  items: string[];
  selected: number;
  onChange: (index: number) => void;
};

export function SegmentedControl({ items, selected, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.canvasCream }]}>
      {items.map((label, i) => {
        const active = i === selected;
        return (
          <Pressable
            key={label}
            onPress={() => onChange(i)}
            style={[styles.segment, active && { backgroundColor: theme.surface }]}>
            <Text style={[styles.label, { color: active ? theme.ink : theme.ash }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
