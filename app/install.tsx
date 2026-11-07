import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Card, T } from "@/components/ui";
import { color, font, minTouch, space } from "@/lib/theme";

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
    <View style={{ flex: 1, backgroundColor: color.ink }}>
      <View style={s.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))} style={s.back} accessibilityRole="button">
          <Text style={s.backText}>‹ กลับ</Text>
        </Pressable>
        <Text style={s.title}>ติดตั้ง StudyQuest</Text>
      </View>
      <ScrollView contentContainerStyle={s.page}>
        {STEPS.map((g) => (
          <Card key={g.title}>
            <Text style={T.h3}>{g.title}</Text>
            {g.steps.map((st, i) => (
              <View key={i} style={[s.step, i > 0 && s.divider]}>
                <View style={s.num}><Text style={s.numText}>{i + 1}</Text></View>
                <Text style={[T.body, { flex: 1 }]}>{st}</Text>
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { backgroundColor: color.navyDeep, borderBottomWidth: 3, borderBottomColor: color.go, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  back: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  backText: { fontFamily: font.body, fontSize: 14, color: color.onNavy },
  title: { fontFamily: font.title, fontSize: 20, color: color.go },
  page: { padding: space.md, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  step: { flexDirection: "row", gap: space.md, alignItems: "flex-start", paddingVertical: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: color.rule },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.go, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: font.bodyBold, fontSize: 14, color: color.paper },
});
