import { Text, View } from "react-native";

export default function InboxBindingScreen() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "600" }}>通知订阅</Text>
      <Text>这里保留未来订阅镜像帖子或回复的入口。</Text>
    </View>
  );
}
