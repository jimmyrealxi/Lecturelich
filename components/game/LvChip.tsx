import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useXp } from "@/lib/queries/xp";
import { color, font } from "@/lib/theme";

/** LV + ช่อง XP 10 ช่อง มุมขวาของหัวหน้าวันนี้ (บนกระดาษ ธีม A) กดไปหน้าเกม */
export function LvChip() {
  const q = useXp();
  if (!q.data) return null; // ยังโหลด/ออฟไลน์ = ไม่โชว์ ไม่ดันหัวเพจ
  const lv = q.data.total;
  const filled = Math.min(10, Math.floor((lv.into / lv.need) * 10));
  return (
    <Pressable onPress={() => router.push("/game")} style={s.chip} accessibilityRole="button"
      accessibilityLabel={`เลเวล ${lv.level} XP ${lv.into} จาก ${lv.need} ไปหน้าเกม`}>
      <Text style={s.lv}>LV {lv.level}</Text>
      <View style={s.cells}>
        {Array.from({ length: 10 }, (_, i) => <View key={i} style={[s.cell, i < filled && s.on]} />)}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { minHeight: 44, alignItems: "flex-end", justifyContent: "flex-end", paddingLeft: 8 },
  lv: { fontFamily: font.typeBold, fontSize: 13, color: color.paper },
  cells: { flexDirection: "row", gap: 3, marginTop: 6 },
  cell: { width: 7, height: 10, borderWidth: 1, borderColor: color.rule2 },
  on: { backgroundColor: color.pen, borderColor: color.pen },
});
