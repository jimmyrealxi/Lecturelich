import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Card, Section, Skeleton, T } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { NotesTimeline } from "@/components/NotesTimeline";
import { useAssignments, useAttendance, useCurrentTerm, useSlots, useSubjects } from "@/lib/queries/core";
import { useProfile } from "@/lib/queries/setup";
import { attendanceStats, bangkokNow, countSessions } from "@/lib/schedule";
import { hhmm } from "@/lib/format";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

// หน้าวิชา: ลิงก์ · การเข้าเรียน · ไทม์ไลน์โน้ต · งานของวิชา — คะแนน (ขั้น 3) จะเพิ่มทีหลัง
export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const attendance = useAttendance(term.data);
  const tasks = useAssignments();
  const today = bangkokNow().date;
  const minPct = useProfile().data?.min_attendance_pct ?? 80;

  const subject = subjects.data?.find((s) => s.id === id);
  const mySlots = useMemo(() => (slots.data ?? []).filter((s) => s.subject_id === id), [slots.data, id]);
  const stats = useMemo(() => {
    if (!term.data) return null;
    const rows = (attendance.data ?? []).filter((r) => r.subject_id === id);
    return attendanceStats(rows.map((r) => r.status), countSessions(mySlots, term.data), minPct);
  }, [attendance.data, id, mySlots, term.data, minPct]);
  const myTasks = (tasks.data ?? []).filter((a) => a.subject_id === id);
  const absentKeys = useMemo(
    () => new Set((attendance.data ?? []).filter((r) => r.status === "absent").map((r) => `${r.slot_id}:${r.date}`)),
    [attendance.data],
  );

  const links = [
    { label: "Classroom", url: subject?.classroom_url },
    { label: "กลุ่มไลน์", url: subject?.line_url },
    { label: "NotebookLM", url: subject?.notebooklm_url },
  ].filter((l): l is { label: string; url: string } => !!l.url);

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <View style={s.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/subjects"))} style={s.back}
          accessibilityRole="button" accessibilityLabel="ย้อนกลับ">
          <Text style={s.backText}>‹ กลับ</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: "/subject/edit", params: { id } })} style={s.edit} accessibilityRole="button">
          <Text style={s.backText}>แก้ไข</Text>
        </Pressable>
        <Text style={s.title}>{subject ? `${subject.code ? subject.code + " · " : ""}${subject.name}` : "…"}</Text>
        <Text style={s.topSub}>
          {mySlots.map((sl) => `${DAY[sl.weekday]} ${hhmm(sl.start_time)}–${hhmm(sl.end_time)}`).join(" · ")}
        </Text>
        {links.length > 0 && (
          <View style={s.links}>
            {links.map((l) => (
              <Pressable key={l.label} style={s.link} onPress={() => Linking.openURL(l.url)} accessibilityRole="link">
                <Text style={s.linkText}>{l.label} ↗</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.page}>
        {!subject ? (
          <Skeleton height={100} />
        ) : (
          stats && (
            <Card>
              <Text style={T.muted}>เข้าเรียน</Text>
              <Text style={s.big}>{stats.pct}%</Text>
              <Text style={[T.muted, stats.warn && { color: color.danger }]}>
                ขาด {stats.absent} ครั้ง ·{" "}
                {stats.remaining >= 0 ? `ขาดได้อีก ${stats.remaining}` : `เกินเกณฑ์ ${-stats.remaining} ครั้ง`}
              </Text>
              <View style={s.bar}><View style={[s.barFill, { width: `${stats.pct}%` }]} /></View>
            </Card>
          )
        )}

        <Section>โน้ตแต่ละคาบ</Section>
        <NotesTimeline subjectId={id} absentKeys={absentKeys} />

        <Section>งานของวิชา</Section>
        <Card>
          {myTasks.length === 0 ? (
            <Text style={T.muted}>ยังไม่มีงาน</Text>
          ) : (
            myTasks.map((a, i) => <TaskRow key={a.id} task={a} today={today} first={i === 0} />)
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { backgroundColor: color.blue, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.lg },
  back: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  edit: { position: "absolute", right: space.lg, top: space.md, minHeight: minTouch, minWidth: minTouch, alignItems: "flex-end", justifyContent: "center" },
  backText: { fontFamily: font.body, fontSize: 14, color: color.white },
  title: { fontFamily: font.heading, fontSize: 20, color: color.white },
  topSub: { fontFamily: font.body, fontSize: 13, color: color.white, opacity: 0.85, marginTop: 2 },
  links: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  link: {
    flex: 1, minHeight: minTouch, borderRadius: radius.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center",
  },
  linkText: { fontFamily: font.body, fontSize: 13, color: color.white },
  page: { padding: space.md, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  big: { fontFamily: font.heading, fontSize: 26, color: color.ink },
  bar: { height: 8, backgroundColor: color.line, borderRadius: 4, overflow: "hidden", marginTop: space.sm },
  barFill: { height: "100%", backgroundColor: color.blue },
});
