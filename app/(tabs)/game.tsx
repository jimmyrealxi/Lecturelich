import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useXp, type Level } from "@/lib/queries/xp";
import { color, font, rarity, space } from "@/lib/theme";
import { XP_CONFIG } from "@/lib/xp";

// หน้าเกม (mockup stage0.html หน้า 4) · ขั้น 4: ตัวละคร + เลเวลวิชาในเทอมนี้ · บอส / passive tree = ขั้น 5

// ชุดตัวละครเปลี่ยนทุก 5 เลเวล (5 ระดับ) · shortcut: sprite ยังเป็นกล่อง placeholder จนกว่าจะวาดภาพจริง (ขั้น 7)
const TIERS = ["นักเรียนฝึกหัด", "ผู้ฝึกตน", "นักค้นคว้า", "ผู้รอบรู้", "ปราชญ์"];

function XpBar({ lv, height = 10 }: { lv: Level; height?: number }) {
  return (
    <View style={[s.bar, { height }]}>
      <View style={[s.barFill, { transform: [{ scaleX: Math.min(1, lv.into / lv.need) }] }]} />
    </View>
  );
}

export default function Game() {
  const q = useXp();
  const d = q.data;

  return (
    <ScrollView style={{ backgroundColor: color.gameBg }} contentContainerStyle={s.page}>
      {!d ? (
        <>
          <View style={[s.panel, { height: 100, opacity: 0.6 }]} />
          {q.isError && <Text style={s.small}>โหลดข้อมูลเกมไม่สำเร็จ (ลองรีเฟรช)</Text>}
        </>
      ) : (
        <>
          <View style={[s.panel, s.hero]}>
            <View style={s.sprite} accessibilityLabel="ตัวละคร (ภาพชั่วคราว)">
              <Text style={s.lv}>{Math.min(5, Math.ceil(d.total.level / 5))}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.lv}>LV {d.total.level}</Text>
              <Text style={s.small}>
                {TIERS[Math.min(4, Math.floor((d.total.level - 1) / 5))]} · ชุดระดับ {Math.min(5, Math.ceil(d.total.level / 5))}/5
              </Text>
              <XpBar lv={d.total} />
              <Text style={[s.small, s.px]}>XP {d.total.into} / {d.total.need}</Text>
            </View>
          </View>

          <Text style={s.title}>วิชา · ซีซั่นเทอมนี้</Text>
          {d.subjects.length === 0 ? (
            <Text style={s.small}>ยังไม่มีวิชาในเทอมนี้</Text>
          ) : (
            <View style={s.grid}>
              {d.subjects.map((sub) => (
                <View key={sub.subject_id} style={[s.panel, s.cell]}>
                  <Text style={s.name} numberOfLines={1}>{sub.name}</Text>
                  <Text style={[s.lv, { fontSize: 16 }]}>LV {sub.level}</Text>
                  <XpBar lv={sub} height={8} />
                  <Text style={[s.small, s.px]}>{sub.into}/{sub.need}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.title}>ได้ XP จาก</Text>
          <View style={s.panel}>
            <Text style={s.small}>มาเรียน +{XP_CONFIG.attend} · จดหลังคาบ +{XP_CONFIG.note} (มีรูป +{XP_CONFIG.notePhoto}) · ส่งงานก่อนกำหนด 1 วัน +{XP_CONFIG.submitEarly} · ตรงเวลา +{XP_CONFIG.submitOnTime}</Text>
            <Text style={[s.small, { marginTop: 4 }]}>แต่ละวิชาได้ไม่เกิน {XP_CONFIG.dailyCapPerSubject} XP ต่อวัน · เลเวลวิชาเริ่มใหม่ทุกเทอม ตัวละครไม่รีเซ็ต</Text>
          </View>

          <Text style={s.title}>สีความหายาก</Text>
          <View style={s.legend}>
            {([["normal", "ปกติ"], ["magic", "magic"], ["rare", "rare"], ["unique", "unique"]] as const).map(([k, label]) => (
              <Text key={k} style={[s.small, { color: rarity[k] }]}>■ {label}</Text>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: space.md, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  panel: { backgroundColor: color.gamePanel, borderWidth: 1, borderColor: color.gameLine, borderRadius: 4, padding: space.md, marginBottom: space.md },
  hero: { flexDirection: "row", gap: space.md, alignItems: "center" },
  sprite: {
    width: 72, height: 72, backgroundColor: color.gameDeep, borderWidth: 2, borderColor: color.brass,
    alignItems: "center", justifyContent: "center",
  },
  lv: { fontFamily: font.pixel, fontSize: 20, color: color.brass },
  px: { fontFamily: font.pixel, marginTop: 4 },
  small: { fontFamily: font.body, fontSize: 12, color: color.gameSub },
  name: { fontFamily: font.body, fontSize: 13, color: color.gameText },
  title: { fontFamily: font.heading, fontSize: 14, color: color.brass, marginTop: space.xs, marginBottom: space.sm },
  bar: { backgroundColor: color.gameDeep, borderWidth: 1, borderColor: color.gameLine, marginTop: 6, overflow: "hidden" },
  barFill: { height: "100%", width: "100%", backgroundColor: color.brass, transformOrigin: "left" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.md },
  cell: { flexBasis: "47%", flexGrow: 1, marginBottom: 0, padding: 10 },
  legend: { flexDirection: "row", gap: space.md, flexWrap: "wrap" },
});
