import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { shortDate } from "@/lib/format";
import { color, font, inkColor, radius, space } from "@/lib/theme";

// ใบประกาศจากคาบ (docs/mockups/a-announce.html) · กระดาษแผ่นเล็กแปะเทปกาว เอียงสลับซ้ายขวา · แตะ = เปิดโน้ตคาบที่จด
// มี subjectName (หน้าวันนี้) = แถวบนเป็นชื่อวิชา + ข้อความไม่เกิน 3 บรรทัด · ไม่มี (หน้าวิชา) = บอกวันที่จด + ข้อความเต็ม

export function AnnounceSlip({ noteId, subjectId, text, from, on, today, subjectName, subjectColor, tilt = -0.8 }: {
  noteId: string; subjectId: string; text: string; from: string; on: string; today: string;
  subjectName?: string; subjectColor?: string; tilt?: number;
}) {
  const isToday = on === today;
  const when = isToday ? "วันนี้" : subjectName ? shortDate(on) : `คาบหน้า ${shortDate(on)}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/notes/[subjectId]", params: { subjectId, note: noteId } })}
      style={({ pressed }) => [s.slip, { transform: [{ rotate: `${tilt}deg` }] }, pressed && { opacity: 0.8 }]}
      accessibilityRole="link"
      accessibilityLabel={`ประกาศ${subjectName ? " " + subjectName : ""} ${when}: ${text} · เปิดโน้ต`}
    >
      <View pointerEvents="none" style={s.glue} />
      <View style={s.k}>
        {subjectName ? (
          <View style={s.subj}>
            <View style={[s.dot, { backgroundColor: inkColor(subjectColor ?? color.pen) }]} />
            <Text style={s.muted} numberOfLines={1}>{subjectName}</Text>
          </View>
        ) : (
          <Text style={s.muted}>คาบที่แล้วบอกไว้ · {shortDate(from)}</Text>
        )}
        <Text style={[s.muted, s.when, isToday && s.today]}>{when}</Text>
      </View>
      <Text style={s.t} numberOfLines={subjectName ? 3 : undefined}>{text}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  slip: {
    backgroundColor: color.deck, borderWidth: 1, borderColor: color.rule2, borderRadius: radius.sm,
    paddingTop: 12, paddingHorizontal: 12, paddingBottom: 10, marginTop: 18,
  },
  // เทปกาวกลางขอบบน
  glue: {
    position: "absolute", top: -8, left: "50%", width: 64, height: 16, marginLeft: -32,
    backgroundColor: color.tape[7].bg, opacity: 0.85, transform: [{ rotate: "-3deg" }],
  },
  k: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  subj: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  muted: { fontFamily: font.body, fontSize: 14, color: color.muted, flexShrink: 1 },
  when: { flexShrink: 0 },
  today: { fontFamily: font.bodyBold, color: color.red },
  t: { fontFamily: font.bodyBold, fontSize: 16, lineHeight: 23, color: color.paper, marginTop: 2 },
});
