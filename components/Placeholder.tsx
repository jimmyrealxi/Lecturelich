import { StyleSheet, Text, View } from "react-native";
import { color, font, space } from "@/lib/theme";

// หน้าชั่วคราวของขั้น 0 — แทนที่ด้วยหน้าจริงในขั้น 1
export function Placeholder({ title }: { title: string }) {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.sub}>ยังไม่ได้ทำ (ขั้น 0)</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  title: { fontFamily: font.heading, fontSize: 22, color: color.ink },
  sub: { fontFamily: font.body, fontSize: 14, color: color.sub, marginTop: space.sm },
});
