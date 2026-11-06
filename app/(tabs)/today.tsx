import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Btn, Card, Section, Skeleton, T } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import {
  useAssignments, useAttendance, useCurrentTerm, useSetAttendance, useSlots, useSubjects,
  type AttendanceRow,
} from "@/lib/queries/core";
import { useNotedSlots } from "@/lib/queries/notes";
import {
  bangkokNow, classState, currentOrNext, endedWithoutNote, slotsOn, toMinutes, type AttendanceStatus, type Slot,
} from "@/lib/schedule";
import { hhmm, thaiDate } from "@/lib/format";
import { color, radius, space } from "@/lib/theme";

const STATUS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "มาเรียน" },
  { value: "absent", label: "ขาด" },
  { value: "no_class", label: "ไม่มีเรียน" },
];

/** เวลาไทยปัจจุบัน อัปเดตทุกนาที */
function useNow() {
  const [now, setNow] = useState(() => bangkokNow());
  useEffect(() => {
    const t = setInterval(() => setNow(bangkokNow()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Today() {
  const now = useNow();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const attendance = useAttendance(term.data);
  const tasks = useAssignments();
  const setAttendance = useSetAttendance(term.data?.id ?? "");

  const subjectById = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s])), [subjects.data]);
  const today = useMemo(() => slotsOn(now.date, slots.data ?? [], term.data ?? null), [now.date, slots.data, term.data]);
  const statusToday = useMemo(
    () => new Map((attendance.data ?? []).filter((r) => r.date === now.date).map((r) => [r.slot_id, r.status])),
    [attendance.data, now.date],
  );
  const noted = useNotedSlots(now.date);
  const focus = currentOrNext(today, now.minutes);
  const notedSet = useMemo(() => new Set(noted.data ?? []), [noted.data]);
  // ยังโหลดไม่เสร็จ = ยังไม่โชว์การ์ด (กันการ์ดแวบขึ้นแล้วหาย)
  const unnoted = noted.data ? endedWithoutNote(today, now.minutes, notedSet, statusToday) : [];
  const upcomingTasks = (tasks.data ?? []).filter((a) => !a.done).slice(0, 5);

  const check = (slot: Slot, status: AttendanceStatus) =>
    setAttendance.mutate({ slot_id: slot.id, subject_id: slot.subject_id, date: now.date, status } as AttendanceRow);

  const loading = term.isPending || (term.data && (slots.isPending || subjects.isPending));

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={T.muted}>{thaiDate(now.date)}</Text>

      {loading ? (
        <>
          <Skeleton height={140} />
          <Skeleton height={160} />
        </>
      ) : !term.data ? (
        <Card style={{ marginTop: space.sm }}>
          <Text style={T.h3}>ยังไม่มีเทอมปัจจุบัน</Text>
          <Text style={[T.muted, { marginTop: 4 }]}>ตั้งเทอม วิชา และตารางเรียนก่อน แล้วหน้านี้จะบอกว่าวันนี้เรียนอะไร</Text>
          <View style={s.row}><Btn kind="primary" label="ไปตั้งค่า" onPress={() => router.push("/settings")} /></View>
        </Card>
      ) : (
        <>
          {focus && (
            <Card style={[s.now, { marginTop: space.sm }]}>
              <View style={s.between}>
                <View style={[s.tag, focus.state === "live" && s.tagLive]}>
                  <Text style={[T.muted, { fontSize: 12 }, focus.state === "live" && { color: color.white }]}>
                    {focus.state === "live"
                      ? `กำลังเรียน · เหลือ ${toMinutes(focus.slot.end_time) - now.minutes} นาที`
                      : `คาบถัดไป · อีก ${toMinutes(focus.slot.start_time) - now.minutes} นาที`}
                  </Text>
                </View>
                <Text style={T.muted}>{focus.slot.room ?? ""}</Text>
              </View>
              <Text style={[T.h3, { marginTop: space.sm }]}>{subjectById.get(focus.slot.subject_id)?.name ?? "วิชา"}</Text>
              <Text style={T.muted}>{hhmm(focus.slot.start_time)}–{hhmm(focus.slot.end_time)}</Text>
              {focus.state === "live" && (
                <View style={s.row}>
                  {STATUS.map((st) => (
                    <Btn key={st.value} label={st.label} selected={statusToday.get(focus.slot.id) === st.value}
                      onPress={() => check(focus.slot, st.value)} />
                  ))}
                </View>
              )}
            </Card>
          )}

          {unnoted.map((slot) => (
            <Card key={slot.id} style={s.unnoted}>
              <Text style={T.h3}>คาบนี้จบแล้ว ยังไม่ได้จด</Text>
              <Text style={T.muted}>
                {subjectById.get(slot.subject_id)?.name ?? "วิชา"} · {hhmm(slot.start_time)}–{hhmm(slot.end_time)}
              </Text>
              <View style={s.row}>
                <Btn kind="primary" label="✎ จดเลย"
                  onPress={() => router.push({ pathname: "/note/[slotId]", params: { slotId: slot.id, date: now.date } })} />
                <Btn label="ไม่มีเรียน" onPress={() => check(slot, "no_class")} style={{ flex: 0.6 }} />
              </View>
            </Card>
          ))}

          <Section>คาบวันนี้</Section>
          <Card>
            {today.length === 0 && <Text style={T.muted}>วันนี้ไม่มีเรียน</Text>}
            {today.map((slot, i) => {
              const subj = subjectById.get(slot.subject_id);
              const state = classState(slot, now.minutes);
              const status = statusToday.get(slot.id);
              return (
                <View key={slot.id} style={[s.slot, i > 0 && s.divider]}>
                  <View style={s.between}>
                    <Text style={[T.muted, s.time]}>{hhmm(slot.start_time)}–{hhmm(slot.end_time)}</Text>
                    <View style={[s.dot, { backgroundColor: subj?.color ?? color.blue }]} />
                    <Pressable style={{ flex: 1 }} onPress={() => subj && router.push(`/subject/${subj.id}`)}>
                      <Text style={T.body}>{subj?.name ?? "วิชา"}</Text>
                      <Text style={T.muted}>{slot.room ?? ""}</Text>
                    </Pressable>
                  </View>
                  {/* คาบที่เริ่มแล้ว: เช็กชื่อย้อนได้จากตรงนี้ (คาบที่กำลังเรียนกดได้ที่การ์ดด้านบนด้วย) */}
                  {state === "ended" && (
                    <View style={s.row}>
                      {STATUS.map((st) => (
                        <Btn key={st.value} label={st.label} selected={status === st.value} onPress={() => check(slot, st.value)} />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        </>
      )}

      <Section>งานใกล้ส่ง</Section>
      <Card>
        {tasks.isPending ? (
          <Skeleton height={44} />
        ) : upcomingTasks.length === 0 ? (
          <Text style={T.muted}>ไม่มีงานค้าง</Text>
        ) : (
          upcomingTasks.map((a, i) => (
            <TaskRow key={a.id} task={a} subjectName={a.subject_id ? subjectById.get(a.subject_id)?.name : undefined}
              today={now.date} first={i === 0} />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: space.md, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  now: { borderColor: color.blue, borderWidth: 1.5 },
  unnoted: { borderStyle: "dashed", borderColor: color.blue, borderWidth: 1.5, backgroundColor: "#EEF2FA" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  row: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  tag: { backgroundColor: color.cream, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  tagLive: { backgroundColor: color.blue },
  slot: { paddingVertical: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: color.line },
  time: { width: 84 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
