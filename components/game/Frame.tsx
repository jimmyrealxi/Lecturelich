import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { color, font, space } from "@/lib/theme";

// ชิ้นส่วนหน้าเกม (b5-game.html): หัวข้อเส้นประดับ + กรอบหิน (ขอบนอก seam2 + ขอบในเข้ม) · วาดเอง ไม่ใช้ภาพของเกมใด

export function H({ children }: { children: ReactNode }) {
  return (
    <View style={s.h} accessibilityRole="header">
      <View style={s.line} />
      <View style={s.dia} />
      <Text style={s.ht}>{children}</Text>
      <View style={s.dia} />
      <View style={s.line} />
    </View>
  );
}

export function Frame({ children, boss, style }: { children: ReactNode; boss?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.frame, boss && s.boss, style]}>{children}</View>;
}

/** แถบ XP ทอง · scaleX (transform เท่านั้น) */
export function Bar({ value, tint = color.gold, line = color.seam, height = 8 }: { value: number; tint?: string; line?: string; height?: number }) {
  return (
    <View style={[s.bar, { height, borderColor: line }]}>
      <View style={[s.fill, { backgroundColor: tint, transform: [{ scaleX: Math.max(0, Math.min(1, value)) }] }]} />
    </View>
  );
}

const s = StyleSheet.create({
  h: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 22, paddingBottom: 10, paddingHorizontal: space.lg },
  line: { flex: 1, height: 1, backgroundColor: color.seam2 },
  dia: { width: 6, height: 6, backgroundColor: color.gold, transform: [{ rotate: "45deg" }] },
  ht: { fontFamily: font.bodyBold, fontSize: 15, color: color.gold },
  frame: {
    marginHorizontal: space.md, backgroundColor: color.gamePanel, borderWidth: 1, borderColor: color.seam2,
    boxShadow: `inset 0 0 0 2px ${color.gameDeep}, inset 0 0 0 3px ${color.seam}`,
  },
  boss: { borderColor: color.bossLine, boxShadow: `inset 0 0 0 2px ${color.gameDeep}, inset 0 0 0 3px ${color.bossLine}` },
  bar: { backgroundColor: color.gameDeep, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  fill: { height: "100%", width: "100%", transformOrigin: "left" },
});
