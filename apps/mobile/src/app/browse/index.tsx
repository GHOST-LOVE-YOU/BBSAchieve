import { Link } from "expo-router";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { SECTIONS, type Section } from "@/features/favorites/boardTree";

export default function BrowseSectionsScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <FlatList
        data={SECTIONS}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: Spacing.three }}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item }: { item: Section }) => (
          <Link
            href={{ pathname: "/browse/[sectionId]", params: { sectionId: item.id } }}
            asChild>
            <Pressable style={StyleSheet.flatten([styles.card, { backgroundColor: theme.surface }])}>
              <Text style={styles.icon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.ink }]}>{item.name}</Text>
                <Text style={[styles.desc, { color: theme.ash }]}>{item.desc}</Text>
              </View>
              <Text style={[styles.count, { color: theme.ash }]}>
                {item.subs.reduce((n, s) => n + s.boards.length, 0)} 板块
              </Text>
            </Pressable>
          </Link>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  icon: { fontSize: 28 },
  name: { fontSize: 17, fontWeight: "600" },
  desc: { fontSize: 13, marginTop: 2 },
  count: { fontSize: 13 },
});
