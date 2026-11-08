import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Card, head, Section, Skeleton, T } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { EmptyScene } from "@/components/EmptyScene";
import { NotesTimeline } from "@/components/NotesTimeline";
import { GradesPanel } from "@/components/GradesPanel";
import { ExamDatesCard } from "@/components/ExamDatesCard";
import { MakeupClasses } from "@/components/MakeupClasses";
import { useExams } from "@/lib/queries/review";
import { useAssignments, useAttendance, useCurrentTerm, useSlots, useSubjects } from "@/lib/queries/core";
import { useProfile } from "@/lib/queries/setup";
import { attendanceStats, bangkokNow, countSessions } from "@/lib/schedule";
import { hhmm } from "@/lib/format";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

// หน้าวิชา: ลิงก์ · การเข้าเรียน · คะแนนและเกรด · ไทม์ไลน์โน้ต · งานของวิชา
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
  const exams = useExams(term.data?.id);
  const myExams = (exams.data ?? []).filter((e) => e.subject_id === id);
  const myTasks =(tasks.data ?? []).filter((a) => a.subject_id === id);
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
    <View style={{ flex: 1 }}>
      <View style={head.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/subjects"))} style={head.backBtn}
          accessibilityRole="button" accessibilityLabel="ย้อนกลับ">
          <Text style={head.back}>‹ วิชา</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: "/subject/edit", params: { id } })} style={s.edit} accessibilityRole="button">
          <Text style={head.back}>แก้ไข</Text>
        </Pressable>
        <Text style={head.title} accessibilityRole="header">{subject?.name ?? "…"}</Text>
        <Text style={s.topSub}>
          {[subject?.code, ...mySlots.filter((sl) => !sl.makeup_date).map((sl) => `${DAY[sl.weekday]} ${hhmm(sl.start_time)}–${hhmm(sl.end_time)}${sl.room ? " · " + sl.room : ""}`)].filter(Boolean).join(" · ")}
        </Text>
        {links.length > 0 && (
          <View style={s.links}>
            {links.map((l) => (
              <Pressable key={l.label} style={s.link} onPress={() => Linking.openURL(l.url)} accessibilityRole="link">
                <Text style={s.linkText}>{l.label}</Text>
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
            <>
              <Section>เข้าเรียน</Section>
              <Card>
                <Text style={s.big}>{stats.pct}%<Text style={s.bigSmall}> · ขาด {stats.absent}</Text></Text>
                <View style={s.bar}><View style={[s.barFill, { width: `${stats.pct}%` }, stats.warn && { backgroundColor: color.danger }]} /></View>
                <Text style={[T.muted, { marginTop: space.sm }, stats.warn && { color: color.danger }]}>
                  {stats.remaining >= 0 ? <>ขาดได้อีก <Text style={s.num}>{stats.remaining}</Text> ครั้ง</> : <>เกินเกณฑ์ <Text style={s.num}>{-stats.remaining}</Text> ครั้ง</>}
                </Text>
              </Card>
            </>
          )
        )}

        {subject && term.data && (
          <>
            <MakeupClasses subjectId={subject.id} term={term.data} slots={mySlots} />

            <Section side="ตั้งแล้วจะเกิดบอส">วันสอบ</Section>
            {exams.data ? (
              <ExamDatesCard key={myExams.map((e) => e.kind + e.date).join()} subjectId={subject.id} termId={term.data.id}
                exams={myExams} today={today} />
            ) : (
              <Skeleton height={120} />
            )}

            <Section side="จากส่วนที่มีคะแนนแล้ว">คะแนนและเกรด</Section>
            <GradesPanel subject={subject} termId={term.data.id} />
          </>
        )}

        <Section>โน้ตแต่ละคาบ</Section>
        <NotesTimeline subjectId={id} subjectName={subject?.name ?? ""} absentKeys={absentKeys} />

        <Section>งานของวิชา</Section>
        <Card>
          {myTasks.length === 0 ? (
            <EmptyScene kind="todo" fact="ยังไม่มีงาน" />
          ) : (
            myTasks.map((a, i) => <TaskRow key={a.id} task={a} today={today} first={i === 0} />)
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  edit: { position: "absolute", right: space.lg, top: space.md, minHeight: 52, minWidth: 72, alignItems: "flex-end", justifyContent: "center" },
  topSub: { fontFamily: font.body, fontSize: 15, color: color.muted, marginTop: 2 },
  links: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  link: {
    flex: 1, minHeight: minTouch, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.paper,
    alignItems: "center", justifyContent: "center",
  },
  linkText: { fontFamily: font.bodyBold, fontSize: 15, color: color.paper },
  page: { padding: space.lg, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  big: { fontFamily: font.typeBold, fontSize: 32, color: color.paper },
  bigSmall: { fontFamily: font.body, fontSize: 16, color: color.muted },
  num: { fontFamily: font.typeBold, color: color.paper },
  bar: { height: 8, backgroundColor: "rgba(42,33,24,0.12)", borderRadius: 2, overflow: "hidden", marginTop: space.sm },
  barFill: { height: "100%", backgroundColor: color.pen },
});
