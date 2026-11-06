import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Btn, Card, Skeleton, T } from "@/components/ui";
import { useAttendance, useCurrentTerm, useSlots, useSubjects } from "@/lib/queries/core";
import { useProfile } from "@/lib/queries/setup";
import { attendanceStats, countSessions } from "@/lib/schedule";
import { hhmm } from "@/lib/format";
import { color, minTouch, space } from "@/lib/theme";

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
      <Text style={[T.muted, { marginBottom: space.sm }]}>{term.data.name} · {rows.length} วิชา</Text>
      {rows.length > 0 && (
        <Card>
          {rows.map(({ subj, when, stats }, i) => (
            <Pressable key={subj.id} style={[s.item, i > 0 && s.divider]} onPress={() => router.push(`/subject/${subj.id}`)}
              accessibilityRole="button">
              <View style={[s.dot, { backgroundColor: subj.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[T.body, { fontWeight: "600" }]}>{subj.name}</Text>
                <Text style={T.muted}>
                  {when || "ยังไม่มีเวลาเรียน"}
                  {stats && " · "}
                  {stats && (stats.warn
                    ? <Text style={{ color: color.danger }}>{stats.remaining >= 0 ? `ขาดได้อีก ${stats.remaining}` : "เกินเกณฑ์ขาด"}</Text>
                    : `เข้าเรียน ${stats.pct}%`)}
                </Text>
              </View>
              <Text style={T.muted}>›</Text>
            </Pressable>
          ))}
        </Card>
      )}
      <Btn label="+ เพิ่มวิชา" onPress={() => router.push("/subject/edit")} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: space.md, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  item: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56, paddingVertical: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: color.line },
  dot: { width: 12, height: 12, borderRadius: 6 },
  hit: { minHeight: minTouch },
});
