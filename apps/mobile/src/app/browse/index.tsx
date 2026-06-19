import { useRouter } from "expo-router";
import React from "react";
import { ColorValue, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FloatingBottomTabs,
  MOBILE_TABBAR_SCROLL_GAP,
  type BottomTabKey,
} from "@/components/bottom-tab-visuals";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { SECTIONS, type Section } from "@/features/favorites/boardTree";

export default function BrowseSectionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const iconTones = [
    theme.surfaceBlush,
    theme.surfaceButter,
    theme.surfaceSage,
    theme.surfaceSky,
    theme.surfacePeach,
    theme.surfaceMauve,
    theme.canvasCream,
  ];
  const handleTabPress = (key: BottomTabKey) => {
    if (key === "home") router.push("/");
    if (key === "favorites") router.push("/favorites");
    if (key === "notifications") router.push("/notifications");
    if (key === "profile") router.push("/profile");
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <FlatList
        data={SECTIONS}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: MOBILE_TABBAR_SCROLL_GAP + insets.bottom }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <>
            <View style={[styles.hero, { backgroundColor: theme.surfaceMauve }]}>
              <Text style={[styles.eyebrow, { color: theme.inkTertiary }]}>浏览所有分区</Text>
              <Text style={[styles.heroTitle, { color: theme.ink }]}>找一个板块来收藏</Text>
              <Text style={[styles.heroSub, { color: theme.inkSecondary }]}>
                分区 → 子分区 → 板块。点击收藏按钮后，板块会出现在「收藏」首页。
              </Text>
            </View>
            <Text style={[styles.listHeader, { color: theme.inkTertiary }]}>全部分区</Text>
          </>
        }
        renderItem={({ item, index }: { item: Section; index: number }) => (
          <Pressable
            android_ripple={{ color: "transparent", borderless: false }}
            onPress={() => router.push({ pathname: "/browse/[sectionId]", params: { sectionId: item.id } })}
            style={StyleSheet.flatten([
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.hairline },
            ])}>
            <View style={[styles.iconBox, { backgroundColor: iconTones[index % iconTones.length] }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.ink }]}>{item.name}</Text>
              <Text style={[styles.desc, { color: theme.ash }]}>{item.desc}</Text>
            </View>
            <ChevronIcon color={theme.inkTertiary} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
      />
      <FloatingBottomTabs active="favorites" onPress={handleTabPress} />
    </View>
  );
}

function ChevronIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.chevIcon}>
      <View style={[styles.chevLineTop, { backgroundColor: color }]} />
      <View style={[styles.chevLineBottom, { backgroundColor: color }]} />
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
  heroTitle: { fontSize: 20, fontWeight: "500", lineHeight: 26 },
  heroSub: { fontSize: 13.5, lineHeight: 20 },
  listHeader: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
  },
  card: {
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },
  name: { fontSize: 14.5, fontWeight: "500" },
  desc: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  chevIcon: {
    width: 16,
    height: 16,
    position: "relative",
  },
  chevLineTop: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 8,
    height: 1.8,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  chevLineBottom: {
    position: "absolute",
    right: 4,
    bottom: 4.5,
    width: 8,
    height: 1.8,
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }],
  },
});
