import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useXp } from "@/lib/queries/xp";
import { color, font } from "@/lib/theme";

/** ชิป LV + แถบ XP เล็กบนหัวหน้าวันนี้ (mockup stage0 หน้า 1) กดไปหน้าเกม */
export function LvChip() {
  const q = useXp();
  if (!q.data) return null; // ยังโหลด/ออฟไลน์ = ไม่โชว์ ไม่ดันหัวเพจ
  const lv = q.data.total;
  return (
    <Pressable onPress={() => router.push("/game")} style={s.chip} accessibilityRole="button"
      accessibilityLabel={`เลเวล ${lv.level} XP ${lv.into} จาก ${lv.need} ไปหน้าเกม`}>
      <Text style={s.lv}>LV {lv.level}</Text>
      <View style={s.bar}>
        <View style={[s.fill, { transform: [{ scaleX: Math.min(1, lv.into / lv.need) }] }]} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6, marginRight: 12, minHeight: 44,
    paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)",
  },
  lv: { fontFamily: font.pixel, fontSize: 12, color: color.white },
  bar: { width: 46, height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.25)" },
  fill: { width: "100%", height: "100%", backgroundColor: color.yellow, transformOrigin: "left" },
});
