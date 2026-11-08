import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { head, T } from "@/components/ui";
import { color, font, space } from "@/lib/theme";

const STEPS: { title: string; steps: string[] }[] = [
  {
    title: "iPhone / iPad (Safari)",
    steps: [
      "เปิดเว็บนี้ใน Safari (แอปอื่นติดตั้งไม่ได้)",
      "แตะปุ่ม แชร์ (สี่เหลี่ยมมีลูกศรขึ้น) ด้านล่างจอ",
      "เลือก เพิ่มไปยังหน้าจอโฮม → เพิ่ม",
      "เปิดแอปจากไอคอนบนหน้าจอโฮม ล็อกอินอีกครั้ง แล้วไปตั้งค่า → เปิดการแจ้งเตือน",
    ],
  },
  {
    title: "Android (Chrome)",
    steps: ["เมนู ⋮ → ติดตั้งแอป หรือ เพิ่มลงในหน้าจอหลัก", "ตั้งค่า → เปิดการแจ้งเตือน → อนุญาต"],
  },
  {
    title: "คอม (Chrome / Edge)",
    steps: ["ใช้ผ่านเบราว์เซอร์ได้เลย หรือกดไอคอนติดตั้งในแถบที่อยู่ถ้าอยากได้หน้าต่างแยก"],
  },
];

/** หน้าแนะนำติดตั้ง PWA (iPhone ต้องติดตั้งก่อนถึงจะรับ push ได้) */
export default function Install() {
  return (
    <View style={{ flex: 1 }}>
      <View style={head.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))} style={head.backBtn} accessibilityRole="button">
          <Text style={head.back}>‹ กลับ</Text>
        </Pressable>
        <Text style={head.title} accessibilityRole="header">ติดตั้ง Lecturelich</Text>
      </View>
      <ScrollView contentContainerStyle={s.page}>
        {STEPS.map((g) => (
          <View key={g.title} style={s.group}>
            <Text style={[T.h3, { marginBottom: 6 }]}>{g.title}</Text>
            {g.steps.map((st, i) => (
              <View key={i} style={[s.step, i === g.steps.length - 1 && s.last]}>
                <View style={s.num}><Text style={s.numText}>{i + 1}</Text></View>
                <Text style={[T.body, { flex: 1 }]}>{st}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  // แถวบนกระดาษมีเส้นบรรทัดคั่น (mockup a-settings จอ 6) ไม่ใช้การ์ด
  group: { marginBottom: space.xl },
  step: { flexDirection: "row", gap: space.md, alignItems: "flex-start", paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.rule },
  last: { borderBottomWidth: 1, borderBottomColor: color.rule },
  // เลขขั้น = วงหมึก ตัว Courier
  num: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: color.paper, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: font.typeBold, fontSize: 15, color: color.paper },
});
