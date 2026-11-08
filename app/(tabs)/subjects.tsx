import { useTabTop } from "@/lib/useTabTop";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { KIND } from "@/components/game/Review";
import { AddBtn, Btn, Card, CrtFocus, Dymo, Section, Skeleton, Stamp, T } from "@/components/ui";
import { useAttendance, useCurrentTerm, useSlots, useSubjects } from "@/lib/queries/core";
import { useExams, useTopics } from "@/lib/queries/review";
import { useProfile } from "@/lib/queries/setup";
import { daysUntil, examReady, nearExam } from "@/lib/review";
import { attendanceRisk, attendanceStats, bangkokNow, countSessions } from "@/lib/schedule";
import { hhmm, shortDate } from "@/lib/format";
import { color, font, inkColor, space } from "@/lib/theme";

export const DAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function Subjects() {
  const top = useTabTop();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const attendance = useAttendance(term.data);
  const minPct = useProfile().data?.min_attendance_pct ?? 80;
  const exams = useExams(term.data?.id).data ?? [];
  const topics = useTopics(term.data?.id).data ?? [];
  const today = bangkokNow().date;

  const rows = useMemo(() => (subjects.data ?? []).map((subj) => {
    const mine = (slots.data ?? []).filter((s) => s.subject_id === subj.id)
      .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
    const marks = (attendance.data ?? []).filter((r) => r.subject_id === subj.id);
    const stats = term.data && marks.length ? attendanceStats(marks.map((r) => r.status), countSessions(mine, term.data), minPct) : null;
    return { subj, when: mine.filter((s) => !s.makeup_date).map((s) => `${DAY_SHORT[s.weekday]} ${hhmm(s.start_time)}`).join(" · "), stats };
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

  // จอเขียว (docs/mockups/a-crt-focus.html): สอบใกล้สุดภายใน 14 วัน > วิชาใกล้เกินเกณฑ์ขาด > ไม่มี = ซ่อน
  const exam = nearExam(exams, today);
  const examName = exam && rows.find((r) => r.subj.id === exam.subject_id)?.subj.name;
  const ready = exam ? examReady(exam, exams, topics) : null;
  const risk = attendanceRisk(rows);
  const openSubject = (id: string) => router.push(`/subject/${id}`);

  return (
    <ScrollView ref={top} contentContainerStyle={s.page}>
      <View style={s.meta}><Dymo>{term.data.name}</Dymo><Text style={T.muted}>· {rows.length} วิชา</Text></View>
      {exam && examName ? (
        <Pressable onPress={() => openSubject(exam.subject_id)} accessibilityRole="button" accessibilityLabel={`เปิดหน้าวิชา ${examName}`}>
          <CrtFocus label="สอบใกล้สุด" title={examName} big={`D-${daysUntil(exam.date, today)}`}
            detail={`${KIND[exam.kind]} · ${shortDate(exam.date)}${ready === null ? "" : ` · พร้อมสอบ ${ready}%`}`} />
        </Pressable>
      ) : risk?.stats ? (
        <Pressable onPress={() => openSubject(risk.subj.id)} accessibilityRole="button" accessibilityLabel={`เปิดหน้าวิชา ${risk.subj.name}`}>
          <CrtFocus label={risk.stats.remaining < 0 ? "เกินเกณฑ์ขาด" : "ใกล้เกินเกณฑ์ขาด"} title={risk.subj.name}
            detail={`ขาดแล้ว ${risk.stats.absent} ครั้ง · ขาดได้ไม่เกิน ${risk.stats.maxAbsent}`}
            big={String(Math.abs(risk.stats.remaining))} unit="ครั้ง" />
        </Pressable>
      ) : null}
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
  pctSub: { fontFamily: font.body, fontSize: 14, color: color.muted },
});
