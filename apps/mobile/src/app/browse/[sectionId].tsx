import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ColorValue, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import {
  FloatingBottomTabs,
  MOBILE_TABBAR_SCROLL_GAP,
  type BottomTabKey,
} from "@/components/bottom-tab-visuals";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useKindeUser } from "@/features/auth/useKindeUser";
import { findSectionById } from "@/features/favorites/boardTree";
import { useBoardFavorites } from "@/features/favorites/useBoardFavorites";
import type { BoardEntry } from "@/features/favorites/boardTree";

export default function BrowseSubsScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useKindeUser();
  const userId = user?.id ?? null;
  const { toggle, isFavorite } = useBoardFavorites(userId);
  const section = findSectionById(sectionId);
  const handleTabPress = (key: BottomTabKey) => {
    if (key === "home") router.push("/");
    if (key === "favorites") router.push("/favorites");
    if (key === "notifications") router.push("/notifications");
    if (key === "profile") router.push("/profile");
  };

  if (!section) {
    return (
      <View style={[styles.root, { backgroundColor: theme.canvas }]}>
        <Stack.Screen options={{ title: "分区不存在" }} />
        <EmptyState icon="📋" title="分区不存在" />
      </View>
    );
  }

  const sections = section.subs.map((sub) => ({
    title: sub.name,
    data: sub.boards,
  }));

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <Stack.Screen options={{ title: section.name }} />
      <SectionList
        sections={sections}
        keyExtractor={(b) => b.slug}
        contentContainerStyle={{ paddingBottom: MOBILE_TABBAR_SCROLL_GAP + insets.bottom }}
        contentInsetAdjustmentBehavior="automatic"
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            <View style={styles.crumb}>
              <Text style={[styles.crumbText, { color: theme.inkTertiary }]}>分区</Text>
              <Text style={[styles.crumbSep, { color: theme.ash }]}>›</Text>
              <Text style={[styles.crumbCurrent, { color: theme.ink }]}>{section.name}</Text>
            </View>
            <View style={[styles.hero, { backgroundColor: theme.surfaceMauve }]}>
              <Text style={[styles.eyebrow, { color: theme.inkTertiary }]}>{section.icon} {section.name}</Text>
              <Text style={[styles.heroTitle, { color: theme.ink }]}>子分区与板块</Text>
              <Text style={[styles.heroSub, { color: theme.inkSecondary }]}>
                点击圆形收藏按钮加入收藏；点击板块进入帖子列表。
              </Text>
            </View>
          </>
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.subTitle, { color: theme.inkTertiary }]}>{title}</Text>
        )}
        renderItem={({ item }: { item: BoardEntry }) => (
          <Pressable
            android_ripple={{ color: "transparent", borderless: false }}
            onPress={() => router.push({ pathname: "/boards/[boardId]", params: { boardId: item.slug } })}
            style={StyleSheet.flatten([
              styles.row,
              { backgroundColor: theme.surface, borderColor: theme.hairline },
            ])}>
            <View style={[styles.iconBox, { backgroundColor: theme.canvasCream }]}>
              <Text style={[styles.iconText, { color: theme.inkSecondary }]}>{item.name.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.boardName, { color: theme.ink }]}>{item.name}</Text>
              <Text style={[styles.boardDesc, { color: theme.ash }]}>{item.desc}</Text>
            </View>
            <Pressable
              android_ripple={{ color: "transparent", borderless: true }}
              onPress={(event) => {
                event.stopPropagation();
                toggle(item.slug);
              }}
              hitSlop={8}
              style={[
                styles.starButton,
                {
                  backgroundColor: isFavorite(item.slug) ? "rgba(24,99,220,0.12)" : theme.canvasSoft,
                },
              ]}>
              <StarIcon color={isFavorite(item.slug) ? theme.primary : theme.inkTertiary} filled={isFavorite(item.slug)} />
            </Pressable>
          </Pressable>
        )}
        SectionSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
      />
      <FloatingBottomTabs active="favorites" onPress={handleTabPress} />
    </View>
  );
}

function StarIcon({ color, filled }: { color: ColorValue; filled: boolean }) {
  return (
    <View style={styles.bookmarkIcon}>
      <View
        style={[
          styles.bookmarkBody,
          {
            borderColor: color,
            backgroundColor: filled ? color : "transparent",
          },
        ]}
      />
      <View style={[styles.bookmarkCutLeft, { backgroundColor: filled ? "#fff" : color }]} />
      <View style={[styles.bookmarkCutRight, { backgroundColor: filled ? "#fff" : color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 18,
    gap: 8,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
  },
  crumb: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  crumbText: { fontSize: 12 },
  crumbSep: { fontSize: 13 },
  crumbCurrent: { fontSize: 12, fontWeight: "500" },
  heroTitle: { fontSize: 20, fontWeight: "500", lineHeight: 26 },
  heroSub: { fontSize: 13.5, lineHeight: 20 },
  subTitle: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  row: {
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 14, fontWeight: "600" },
  boardName: { fontSize: 14.5, fontWeight: "500" },
  boardDesc: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  starButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkIcon: {
    width: 18,
    height: 20,
    position: "relative",
  },
  bookmarkBody: {
    position: "absolute",
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
    position: "absolute",
    left: 4,
    bottom: 2,
    width: 8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "32deg" }],
  },
  bookmarkCutRight: {
    position: "absolute",
    right: 4,
    bottom: 2,
    width: 8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "-32deg" }],
  },
});
