import { useRouter } from "expo-router";
import { ColorValue, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FloatingBottomTabs,
  MOBILE_TABBAR_SCROLL_GAP,
  type BottomTabKey,
} from "@/components/bottom-tab-visuals";
import { useTheme } from "@/hooks/use-theme";

const TARGETS = [
  {
    icon: "帖",
    title: "订阅镜像帖子",
    desc: "帖子有新回复时通知你，仍然保持匿名接收。",
    tone: "sky",
  },
  {
    icon: "楼",
    title: "订阅具体回复",
    desc: "只追踪某一层楼的后续互动，不绑定机器人身份。",
    tone: "mauve",
  },
  {
    icon: "搜",
    title: "搜索机器人与回复",
    desc: "从机器人主页进入最近发帖和最近回复，再选择订阅对象。",
    tone: "sage",
  },
] as const;

export default function InboxBindingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goTab = (key: BottomTabKey) => {
    const routes = {
      home: "/",
      favorites: "/favorites",
      notifications: "/notifications",
      profile: "/profile",
    } as const;

    router.push(routes[key]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <ScrollView
        style={styles.scroller}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: MOBILE_TABBAR_SCROLL_GAP + insets.bottom }}
        contentInsetAdjustmentBehavior="automatic">
        <View style={[styles.hero, { backgroundColor: theme.surfacePeach }]}>
          <Text style={[styles.eyebrow, { color: theme.inkTertiary }]}>通知订阅</Text>
          <Text style={[styles.heroTitle, { color: theme.ink }]}>只订阅具体帖子或回复</Text>
          <Text style={[styles.heroSub, { color: theme.inkSecondary }]}>
            订阅只代表接收匿名通知，不表达认领身份，也不会把真实用户和机器人混在一起。
          </Text>
          <View style={[styles.stat, { backgroundColor: "rgba(255,255,255,0.55)" }]}>
            <Text style={[styles.statStrong, { color: theme.ink }]}>3</Text>
            <Text style={[styles.statText, { color: theme.inkSecondary }]}>类入口</Text>
          </View>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionEyebrow, { color: theme.inkTertiary }]}>可订阅对象</Text>
          <Text style={[styles.sectionHeading, { color: theme.ink }]}>从哪里开始？</Text>
        </View>

        <View style={[styles.cardGroup, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          {TARGETS.map((item, index) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [
                styles.row,
                index !== TARGETS.length - 1 && {
                  borderBottomColor: theme.hairlineSoft,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
                pressed && { backgroundColor: theme.canvasSoft },
              ]}>
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor:
                      item.tone === "sky"
                        ? theme.surfaceSky
                        : item.tone === "mauve"
                          ? theme.surfaceMauve
                          : theme.surfaceSage,
                  },
                ]}>
                <Text style={[styles.iconText, { color: theme.ink }]}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowTitle, { color: theme.ink }]}>{item.title}</Text>
                <Text style={[styles.rowDesc, { color: theme.inkTertiary }]}>{item.desc}</Text>
              </View>
              <ChevronIcon color={theme.inkTertiary} />
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionTitle}>
          <Text style={[styles.sectionEyebrow, { color: theme.inkTertiary }]}>边界</Text>
          <Text style={[styles.sectionHeading, { color: theme.ink }]}>不会订阅机器人身份</Text>
        </View>

        <View style={[styles.note, { backgroundColor: theme.canvasSoft, borderColor: theme.hairline }]}>
          <Text style={[styles.noteText, { color: theme.inkSecondary }]}>
            机器人可能对应多个源站用户。通知范围只落在镜像帖子或镜像回复上，后续可通过搜索回复、搜索机器人用户来快速找到可订阅条目。
          </Text>
        </View>
      </ScrollView>
      <FloatingBottomTabs active="profile" onPress={goTab} />
    </View>
  );
}

function ChevronIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.chevIcon}>
      <View style={[styles.chevTop, { backgroundColor: color }]} />
      <View style={[styles.chevBottom, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroller: {
    flex: 1,
  },
  hero: {
    marginHorizontal: 14,
    marginBottom: 18,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 26,
  },
  heroSub: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  stat: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  statStrong: {
    fontSize: 15,
    fontWeight: "600",
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionTitle: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "500",
  },
  cardGroup: {
    marginHorizontal: 14,
    marginBottom: 18,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: "500",
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  chevIcon: {
    width: 16,
    height: 16,
    position: "relative",
  },
  chevTop: {
    position: "absolute",
    right: 4,
    top: 3,
    width: 2,
    height: 7,
    borderRadius: 2,
    transform: [{ rotate: "-38deg" }],
  },
  chevBottom: {
    position: "absolute",
    right: 4,
    bottom: 3,
    width: 2,
    height: 7,
    borderRadius: 2,
    transform: [{ rotate: "38deg" }],
  },
  note: {
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
