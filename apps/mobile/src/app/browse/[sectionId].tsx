import { useLocalSearchParams } from "expo-router";
import { Link } from "expo-router";
import React from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useKindeUser } from "@/features/auth/useKindeUser";
import { findSectionById } from "@/features/favorites/boardTree";
import { useBoardFavorites } from "@/features/favorites/useBoardFavorites";
import type { BoardEntry } from "@/features/favorites/boardTree";

export default function BrowseSubsScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const theme = useTheme();
  const user = useKindeUser();
  const userId = user?.id ?? null;
  const { toggle, isFavorite } = useBoardFavorites(userId);
  const section = findSectionById(sectionId);

  if (!section) {
    return (
      <View style={[styles.root, { backgroundColor: theme.canvas }]}>
        <Text style={[styles.empty, { color: theme.ash }]}>分区不存在</Text>
      </View>
    );
  }

  const sections = section.subs.map((sub) => ({
    title: sub.name,
    data: sub.boards,
  }));

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <SectionList
        sections={sections}
        keyExtractor={(b) => b.slug}
        contentContainerStyle={{ padding: Spacing.three }}
        contentInsetAdjustmentBehavior="automatic"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.subTitle, { color: theme.inkSecondary }]}>{title}</Text>
        )}
        renderItem={({ item }: { item: BoardEntry }) => (
          <Link
            href={{ pathname: "/boards/[boardId]", params: { boardId: item.slug } }}
            asChild>
            <Pressable style={StyleSheet.flatten([styles.row, { backgroundColor: theme.surface }])}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.boardName, { color: theme.ink }]}>{item.name}</Text>
                <Text style={[styles.boardDesc, { color: theme.ash }]}>{item.desc}</Text>
              </View>
              <Pressable onPress={() => toggle(item.slug)} hitSlop={8}>
                <Text style={{ fontSize: 20 }}>
                  {isFavorite(item.slug) ? "⭐" : "☆"}
                </Text>
              </Pressable>
            </Pressable>
          </Link>
        )}
        SectionSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { textAlign: "center", paddingVertical: 60, fontSize: 16 },
  subTitle: {
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: Spacing.two,
    textTransform: "uppercase",
  },
  row: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  boardName: { fontSize: 16, fontWeight: "600" },
  boardDesc: { fontSize: 13, marginTop: 2 },
});
