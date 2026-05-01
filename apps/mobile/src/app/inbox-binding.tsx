import { Text, View } from "react-native";

export default function InboxBindingScreen() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "600" }}>通知与绑定入口</Text>
      <Text>这里保留未来绑定机器人收件箱的入口。</Text>
    </View>
  );
}
