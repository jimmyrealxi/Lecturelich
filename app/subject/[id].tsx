import { useMemo, useRef, useState, type ComponentRef } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AddBtn, Card, head, Section, Skeleton, T } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { GradesPanel, CutoffSettings } from "@/components/GradesPanel";
import { ExamDatesCard } from "@/components/ExamDatesCard";
import { MakeupClasses } from "@/components/MakeupClasses";
import { useExams } from "@/lib/queries/review";
import { daysUntil } from "@/lib/review";
import { useAssignments, useAttendance, useCurrentTerm, useSlots, useSubjects } from "@/lib/queries/core";
import { useProfile } from "@/lib/queries/setup";
import { attendanceStats, bangkokNow, countSessions } from "@/lib/schedule";
import { NotesTimeline } from "@/components/NotesTimeline";
import { hhmm } from "@/lib/format";
import { color, crtGlow, font, minTouch, radius, space } from "@/lib/theme";

const DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

// หน้าวิชา (docs/mockups/a-subject-page.html): สรุป 2 ช่อง → คะแนน → โน้ต 2 สัปดาห์ → งาน → ตั้งค่าวิชา (ยุบ)
export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const attendance = useAttendance(term.data);
  const tasks = useAssignments();
  const today = bangkokNow().date;
  const minPct = useProfile().data?.min_attendance_pct ?? 80;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const setY = useRef(0);
  const [setOpen, setSetOpen] = useState(false);

  const subject = subjects.data?.find((s) => s.id === id);
  const mySlots = useMemo(() => (slots.data ?? []).filter((s) => s.subject_id === id), [slots.data, id]);
  const stats = useMemo(() => {
    if (!term.data) return null;
    const rows = (attendance.data ?? []).filter((r) => r.subject_id === id);
    return attendanceStats(rows.map((r) => r.status), countSessions(mySlots, term.data), minPct);
  }, [attendance.data, id, mySlots, term.data, minPct]);
  const exams = useExams(term.data?.id);
  const myExams = (exams.data ?? []).filter((e) => e.subject_id === id);
  const nextExam = myExams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const myTasks = (tasks.data ?? []).filter((a) => a.subject_id === id);
  // ไทม์ไลน์โน้ต 2 สัปดาห์ล่าสุด · ทั้งหมดอยู่หน้า /notes
  const absentKeys = useMemo(
    () => new Set((attendance.data ?? []).filter((r) => r.status === "absent").map((r) => `${r.slot_id}:${r.date}`)),
    [attendance.data],
  );
  const since = new Date(Date.parse(today + "T00:00:00Z") - 14 * 86_400_000).toISOString().slice(0, 10);

  const links = [
    { label: "Classroom", url: subject?.classroom_url },
    { label: "กลุ่มไลน์", url: subject?.line_url },
    { label: "NotebookLM", url: subject?.notebooklm_url },
  ].filter((l): l is { label: string; url: string } => !!l.url);

  // "แก้ไข" / ช่องสอบ → กางตั้งค่าวิชาแล้วเลื่อนลงไป
  const openSettings = () => {
    setSetOpen(true);
    requestAnimationFrame(() => scroll.current?.scrollTo({ y: setY.current, animated: true }));
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={head.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/subjects"))} style={head.backBtn}
          accessibilityRole="button" accessibilityLabel="ย้อนกลับ">
          <Text style={head.back}>‹ วิชา</Text>
        </Pressable>
        <Pressable onPress={openSettings} style={s.edit} accessibilityRole="button" accessibilityLabel="แก้ไข (ไปที่ตั้งค่าวิชา)">
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

      <ScrollView ref={scroll} contentContainerStyle={s.page}>
        {!subject || !stats ? (
          <Skeleton height={76} />
        ) : (
          <View style={s.stat}>
            <View style={s.tile} accessible accessibilityLabel={`มาเรียน ${stats.pct}% ${stats.remaining >= 0 ? `ขาดได้อีก ${stats.remaining}` : `เกินเกณฑ์ ${-stats.remaining}`}`}>
              <Text style={[s.tileBig, stats.warn && s.tileBad]}>{stats.pct}%</Text>
              <Text style={s.tileK}>{stats.remaining >= 0 ? `มาเรียน · ขาดได้อีก ${stats.remaining}` : `เกินเกณฑ์ขาด ${-stats.remaining} ครั้ง`}</Text>
            </View>
            <Pressable style={s.tile} onPress={openSettings} accessibilityRole="button">
              <Text style={s.tileBig}>{nextExam ? `D-${daysUntil(nextExam.date, today)}` : "–"}</Text>
              <Text style={s.tileK}>{nextExam ? (nextExam.kind === "final" ? "สอบปลายภาค" : "สอบกลางภาค") : "ตั้งวันสอบ"}</Text>
            </Pressable>
          </View>
        )}

        {subject && term.data && (
          <>
            <Section>คะแนน</Section>
            <GradesPanel subject={subject} termId={term.data.id} />
          </>
        )}

        <Section>โน้ตแต่ละคาบ</Section>
        <NotesTimeline subjectId={id} subjectName={subject?.name ?? ""} absentKeys={absentKeys} since={since} compact />
        <Pressable style={s.notesLink} onPress={() => router.push({ pathname: "/notes/[subjectId]", params: { subjectId: id } })}
          accessibilityRole="link">
          <Text style={s.linkText}>เปิดโน้ตทุกคาบ ›</Text>
        </Pressable>

        <Section>งานของวิชา</Section>
        {myTasks.length === 0 ? (
          <Text style={[T.body, s.none]}>ยังไม่มีงานของวิชานี้</Text>
        ) : (
          <Card>{myTasks.map((a, i) => <TaskRow key={a.id} task={a} today={today} first={i === 0} />)}</Card>
        )}

        {subject && term.data && (
          <View style={s.set} onLayout={(e) => { setY.current = e.nativeEvent.layout.y; }}>
            <Pressable style={s.setHead} onPress={() => setSetOpen(!setOpen)} accessibilityRole="button" accessibilityState={{ expanded: setOpen }}>
              <Text style={s.setTitle}>ตั้งค่าวิชา</Text>
              <Text style={[s.chev, setOpen && s.chevOn]} aria-hidden>▾</Text>
            </Pressable>
            {setOpen && (
              <View style={s.setBody}>
                <Text style={s.h}>ชื่อ รหัส ตารางเรียน</Text>
                <AddBtn label="แก้ชื่อวิชา ลิงก์ และตารางเรียน ›" onPress={() => router.push({ pathname: "/subject/edit", params: { id } })} />
                <Text style={s.h}>วันสอบ</Text>
                {exams.data ? (
                  <ExamDatesCard key={myExams.map((e) => e.kind + e.date).join()} subjectId={subject.id} termId={term.data.id} exams={myExams} />
                ) : (
                  <Skeleton height={120} />
                )}
                <Text style={s.h}>คาบชดเชย</Text>
                <MakeupClasses subjectId={subject.id} term={term.data} slots={mySlots} />
                <Text style={s.h}>เกณฑ์ตัดเกรด</Text>
                <CutoffSettings subject={subject} termId={term.data.id} />
              </View>
            )}
          </View>
        )}
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
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm,
  },
  linkText: { fontFamily: font.bodyBold, fontSize: 15, color: color.paper },
  notesLink: {
    minHeight: minTouch, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.paper, alignItems: "center", justifyContent: "center",
    marginBottom: space.md, marginTop: space.sm,
  },
  page: { padding: space.lg, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  // สรุป 2 ช่อง = จอเขียวจิ๋ว (ตัวเลข VT323 · คำไทย Anuphan)
  stat: { flexDirection: "row", gap: space.sm },
  tile: { flex: 1, minHeight: minTouch, backgroundColor: color.crt, borderRadius: 8, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 9, alignItems: "center" },
  tileBig: { fontFamily: font.num, fontSize: 32, lineHeight: 34, color: color.crtOn, ...crtGlow.title },
  tileBad: { color: "#FFB4A8" },
  tileK: { fontFamily: font.body, fontSize: 14, color: color.crtDim, textAlign: "center" },
  none: { paddingVertical: space.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.rule },
  set: { marginTop: 32, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.rule2, borderRadius: radius.md },
  setHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, paddingHorizontal: space.md },
  setTitle: { fontFamily: font.bodyBold, fontSize: 17, color: color.paper },
  chev: { fontSize: 16, color: color.paper, width: 18, textAlign: "center" },
  chevOn: { transform: [{ rotate: "180deg" }] },
  setBody: { paddingHorizontal: space.md, paddingBottom: space.md },
  h: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper, marginTop: space.md, marginBottom: 6 },
});
