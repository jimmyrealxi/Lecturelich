import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AddBtn, Btn, Card, Dymo, Section, Skeleton, Stamp, T } from "@/components/ui";
import { useAttendance, useCurrentTerm, useSlots, useSubjects } from "@/lib/queries/core";
import { useProfile } from "@/lib/queries/setup";
import { attendanceStats, countSessions } from "@/lib/schedule";
import { hhmm } from "@/lib/format";
import { color, font, inkColor, space } from "@/lib/theme";

export const DAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function Subjects() {
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const attendance = useAttendance(term.data);
  const minPct = useProfile().data?.min_attendance_pct ?? 80;

  const rows = useMemo(() => (subjects.data ?? []).map((subj) => {
    const mine = (slots.data ?? []).filter((s) => s.subject_id === subj.id)
      .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
    const marks = (attendance.data ?? []).filter((r) => r.subject_id === subj.id);
    const stats = term.data && marks.length ? attendanceStats(marks.map((r) => r.status), countSessions(mine, term.data), minPct) : null;
    return { subj, when: mine.map((s) => `${DAY_SHORT[s.weekday]} ${hhmm(s.start_time)}`).join(" · "), stats };
  }), [subjects.data, slots.data, attendance.data, term.data, minPct]);

  if (term.isPending || (term.data && subjects.isPending)) {
    return <View style={s.page}><Skeleton height={200} /></View>;
  }
  if (!term.data) {
    return (
      <View style={s.page}>
        <Card>
          <Text style={T.h3}>ยังไม่มีเทอม</Text>
          <Text style={T.muted}>เพิ่มเทอมในหน้าตั้งค่าก่อน แล้วค่อยเพิ่มวิชา</Text>
          <View style={{ flexDirection: "row", marginTop: space.sm }}><Btn kind="primary" label="ไปตั้งค่า" onPress={() => router.push("/settings")} /></View>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.meta}><Dymo>{term.data.name}</Dymo><Text style={T.muted}>· {rows.length} วิชา</Text></View>
      {rows.length > 0 && <Section side="เวลาเรียน · เข้าเรียน">เทอมนี้</Section>}
      {rows.map(({ subj, when, stats }, i) => (
        <Pressable key={subj.id} style={[s.item, i === rows.length - 1 && s.last]} onPress={() => router.push(`/subject/${subj.id}`)}
          accessibilityRole="button" accessibilityLabel={`${subj.name} ${stats ? `เข้าเรียน ${stats.pct}%` : ""}`}>
          <View style={[s.sq, { backgroundColor: inkColor(subj.color) }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.what}>{subj.name}</Text>
            <Text style={T.muted}>{[subj.code, when || "ยังไม่มีเวลาเรียน"].filter(Boolean).join(" · ")}</Text>
          </View>
          {/* ตรายาง "เกินเกณฑ์" จุดเดียวต่อจอ = วิชาแรกที่ขาดเกิน */}
          {stats && stats.remaining < 0 && rows.findIndex((r) => r.stats && r.stats.remaining < 0) === i ? <Stamp>เกินเกณฑ์</Stamp> : (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[s.pct, stats?.warn && { color: color.danger }]}>{stats ? `${stats.pct}%` : "—"}</Text>
              <Text style={[s.pctSub, stats?.warn && { color: color.danger }]}>
                {!stats ? "ยังไม่เช็ก" : stats.warn ? (stats.remaining >= 0 ? `ขาดได้อีก ${stats.remaining}` : "เกินเกณฑ์") : "เข้าเรียน"}
              </Text>
            </View>
          )}
        </Pressable>
      ))}
      <AddBtn label="+ เพิ่มวิชา" onPress={() => router.push("/subject/edit")} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: color.rule },
  last: { borderBottomWidth: 1, borderBottomColor: color.rule },
  sq: { width: 14, height: 14, borderRadius: 2 },
  what: { fontFamily: font.bodyBold, fontSize: 15, color: color.paper },
  pct: { fontFamily: font.typeBold, fontSize: 19, color: color.paper },
  pctSub: { fontFamily: font.body, fontSize: 12, color: color.muted },
});
