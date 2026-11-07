import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, Card, Skeleton, T } from "@/components/ui";
import { LvChip } from "@/components/game/LvChip";
import {
  useAssignments, useAttendance, useCurrentTerm, useSetAttendance, useSlots, useSubjects, useToggleDone,
  type AttendanceRow, type Assignment,
} from "@/lib/queries/core";
import { useNotedSlots } from "@/lib/queries/notes";
import { useXpToday } from "@/lib/queries/xp";
import {
  bangkokNow, currentOrNext, endedWithoutNote, slotsOn, toMinutes, type AttendanceStatus, type Slot,
} from "@/lib/schedule";
import { dueInfo, dur, hhmm, thaiDate } from "@/lib/format";
import { color, font, minTouch, space } from "@/lib/theme";
import { XP_CONFIG } from "@/lib/xp";

// หน้าวันนี้ "สมุดเทอร์มินัล" (docs/mockups/retro-theme.html v3)
// ตัวเด่นตัวเดียว (กำลังเรียน / คาบถัดไป / งานใกล้สุด) · ที่เหลือเป็นบรรทัดบันทึก · XP วันนี้ยุบเป็นบรรทัดเดียว

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
  const insets = useSafeAreaInsets();
  const now = useNow();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const attendance = useAttendance(term.data);
  const tasks = useAssignments();
  const setAttendance = useSetAttendance(term.data?.id ?? "");
  const toggle = useToggleDone();
  const xpToday = useXpToday(now.date);
  // งานที่เพิ่งติ๊กในหน้านี้ ยังโชว์ขีดฆ่าไว้ (ไม่หายวับ) · toast = ยกเลิกได้ 3 วิ
  const [ticked, setTicked] = useState<string[]>([]);
  const [toast, setToast] = useState<Assignment | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const subjectById = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s])), [subjects.data]);
  const today = useMemo(() => slotsOn(now.date, slots.data ?? [], term.data ?? null), [now.date, slots.data, term.data]);
  const statusToday = useMemo(
    () => new Map((attendance.data ?? []).filter((r) => r.date === now.date).map((r) => [r.slot_id, r.status])),
    [attendance.data, now.date],
  );
  const noted = useNotedSlots(now.date);
  const focus = currentOrNext(today, now.minutes);
  const notedSet = useMemo(() => new Set(noted.data ?? []), [noted.data]);
  // ยังโหลดไม่เสร็จ = ยังไม่โชว์ (กันบรรทัดแวบขึ้นแล้วหาย)
  const unnoted = noted.data ? endedWithoutNote(today, now.minutes, notedSet, statusToday) : [];
  const openTasks = (tasks.data ?? []).filter((a) => !a.done || ticked.includes(a.id)).slice(0, 5);
  const nearest = (tasks.data ?? []).find((a) => !a.done && a.due_at);
  const subjName = (id: string | null) => (id && subjectById.get(id)?.name) || "วิชา";

  const check = (slot: Slot, status: AttendanceStatus) =>
    setAttendance.mutate({ slot_id: slot.id, subject_id: slot.subject_id, date: now.date, status } as AttendanceRow);
  const tick = (a: Assignment) => {
    if (a.id.startsWith("temp-")) return;
    toggle.mutate({ id: a.id, done: !a.done });
    if (!a.done) {
      setTicked((t) => [...t, a.id]);
      setToast(a);
    } else setToast(null);
  };
  const undo = () => {
    if (!toast) return;
    toggle.mutate({ id: toast.id, done: false });
    setToast(null);
  };

  const loading = term.isPending || (term.data && (slots.isPending || subjects.isPending));
  const termLabel = term.data ? (term.data.name.includes("เทอม") ? term.data.name : `เทอม ${term.data.name}`) : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top }]}>
        <View style={s.masthead}>
          <View style={{ flexShrink: 1 }}>
            <Text style={s.h2} accessibilityRole="header">วันนี้</Text>
            <Text style={s.meta}>{thaiDate(now.date)}{termLabel ? ` · ${termLabel}` : ""}</Text>
          </View>
          <LvChip />
        </View>

        {loading ? (
          <View style={{ padding: space.lg }}><Skeleton height={180} /><Skeleton height={120} /></View>
        ) : !term.data ? (
          <View style={{ padding: space.lg }}>
            <Card>
              <Text style={T.h3}>ยังไม่มีเทอมปัจจุบัน</Text>
              <Text style={[T.muted, { marginTop: 4 }]}>ตั้งเทอม วิชา และตารางเรียนก่อน แล้วหน้านี้จะบอกว่าวันนี้เรียนอะไร</Text>
              <View style={{ flexDirection: "row", marginTop: space.sm }}>
                <Btn kind="primary" label="ไปตั้งค่า" onPress={() => router.push("/settings")} />
              </View>
            </Card>
          </View>
        ) : (
          <>
            {focus ? (
              <NowPanel
                slot={focus.slot} live={focus.state === "live"} minutes={now.minutes}
                subject={subjectById.get(focus.slot.subject_id)} status={statusToday.get(focus.slot.id)}
                onCheck={(st) => check(focus.slot, st)}
              />
            ) : (
              <View style={s.now} accessibilityLabel="ไม่มีคาบแล้ววันนี้">
                <State text={today.length ? "หมดคาบแล้ววันนี้" : "วันนี้ไม่มีเรียน"} live={false} />
                {nearest?.due_at ? (
                  <>
                    <Text style={s.label}>งานใกล้สุด</Text>
                    <Clock main={dueInfo(nearest.due_at, now.date).time} />
                    <Text style={s.subject}>{nearest.title}</Text>
                    <Text style={s.where}>{subjName(nearest.subject_id)} · ส่ง{dueInfo(nearest.due_at, now.date).day}</Text>
                  </>
                ) : (
                  <Text style={[s.subject, { marginTop: space.md }]}>ไม่มีงานค้าง พักได้</Text>
                )}
              </View>
            )}

            <View style={s.h}>
              <Text style={s.hTitle}>ค้างอยู่</Text>
              <Text style={s.hSide}>{unnoted.length + openTasks.filter((a) => !a.done).length} เรื่อง</Text>
            </View>

            {unnoted.map((slot) => (
              <View key={slot.id} style={s.entry}>
                <Text style={[s.t, { color: color.warn }]}>{hhmm(slot.start_time)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.what}>{subjName(slot.subject_id)}จบแล้ว ยังไม่ได้จด</Text>
                  <Text style={s.sub}>จดวันนี้ +{XP_CONFIG.note} XP · มีรูป +{XP_CONFIG.notePhoto}</Text>
                  <View style={s.links}>
                    {(["absent", "no_class"] as const).map((st) => (
                      <Pressable key={st} onPress={() => check(slot, st)} style={s.miniLink} accessibilityRole="button"
                        accessibilityState={{ selected: statusToday.get(slot.id) === st }}>
                        <Text style={[s.miniText, statusToday.get(slot.id) === st && { color: color.warn }]}>
                          {st === "absent" ? "ขาดคาบนี้" : "งดสอน"}{statusToday.get(slot.id) === st ? " ✓" : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Pressable style={s.act} accessibilityRole="button" accessibilityLabel={`จดโน้ต ${subjName(slot.subject_id)}`}
                  onPress={() => router.push({ pathname: "/note/[slotId]", params: { slotId: slot.id, date: now.date } })}>
                  <Text style={s.actText}>จด</Text>
                </Pressable>
              </View>
            ))}

            {tasks.isPending ? (
              <View style={{ paddingHorizontal: space.lg }}><Skeleton height={44} /></View>
            ) : (
              openTasks.map((a) => {
                const due = a.due_at ? dueInfo(a.due_at, now.date) : null;
                const tone = due && !a.done ? (due.days < 0 ? color.danger : due.days <= 1 ? color.warn : color.paper) : color.paper;
                return (
                  <View key={a.id} style={s.entry}>
                    <Pressable onPress={() => tick(a)} style={s.tick} accessibilityRole="checkbox"
                      accessibilityState={{ checked: a.done }} accessibilityLabel={`ทำเครื่องหมายว่าส่งแล้ว: ${a.title}`}>
                      <View style={[s.box, a.done && s.boxOn]} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.what, a.done && s.doneText]}>{a.title}</Text>
                      <Text style={s.sub}>{a.done ? "ส่งแล้ว" : a.subject_id ? subjName(a.subject_id) : "ไม่ผูกวิชา"}</Text>
                    </View>
                    {due && !a.done && (
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[s.due, { color: tone }]}>{due.day}</Text>
                        <Text style={s.dueSmall}>
                          {due.days <= 1 ? <Text style={s.dueTime}>{due.time}</Text> : `อีก ${due.days} วัน`}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
            {!tasks.isPending && unnoted.length + openTasks.length === 0 && (
              <View style={s.entry}><Text style={s.sub}>ไม่มีอะไรค้าง</Text></View>
            )}
            <View style={s.rule} />

            <Pressable style={s.sum} onPress={() => router.push("/game")} accessibilityRole="link"
              accessibilityLabel="ดู XP ที่ได้วันนี้ ไปหน้าเกม">
              <Text style={s.sumText}>
                {xpToday.data?.xp
                  ? <>ได้วันนี้ <Text style={s.sumXp}>+{xpToday.data.xp} XP</Text> · {xpToday.data.count} รายการ</>
                  : "วันนี้ยังไม่ได้ XP"}
              </Text>
              <Text style={s.sumText} aria-hidden>›</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {toast && (
        <View style={s.toast} accessibilityLiveRegion="polite" role="status">
          <Text style={s.toastText} numberOfLines={2}>ส่ง “{toast.title}” แล้ว</Text>
          <Pressable onPress={undo} style={s.toastBtn} accessibilityRole="button">
            <Text style={s.toastBtnText}>ยกเลิก</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function State({ text, live }: { text: string; live: boolean }) {
  return (
    <View style={s.state}>
      <View style={[s.dot, !live && { backgroundColor: color.onNavyMuted }]} />
      <Text style={[s.stateText, !live && { color: color.onNavyMuted }]}>{text}</Text>
    </View>
  );
}

/** ตัวเลขนาฬิกาใหญ่ + เส้นสแกน (จุดเดียวของทั้งแอปที่มีเส้นสแกน) */
function Clock({ main, small }: { main: string; small?: string }) {
  return (
    <View style={s.clockWrap}>
      <Text style={s.clock}>{main}{small && <Text style={s.clockSmall}>{small}</Text>}</Text>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 15 }, (_, i) => <View key={i} style={[s.scan, { top: i * 4 + 3 }]} />)}
      </View>
    </View>
  );
}

function NowPanel({ slot, live, minutes, subject, status, onCheck }: {
  slot: Slot; live: boolean; minutes: number; subject?: { name: string; code: string | null };
  status?: AttendanceStatus; onCheck: (st: AttendanceStatus) => void;
}) {
  const start = toMinutes(slot.start_time);
  const end = toMinutes(slot.end_time);
  const filled = Math.round(((minutes - start) / Math.max(1, end - start)) * 12);
  const where = [subject?.code, slot.room && `ห้อง ${slot.room}`].filter(Boolean).join(" · ");
  return (
    <View style={s.now} accessibilityLabel={live ? "คาบที่กำลังเรียน" : "คาบถัดไป"}>
      <State text={live ? "กำลังเรียน" : "คาบถัดไป"} live={live} />
      <Clock main={hhmm(slot.start_time)} small={`–${hhmm(slot.end_time)}`} />
      <Text style={s.subject}>{subject?.name ?? "วิชา"}</Text>
      {!!where && <Text style={s.where}>{where}</Text>}
      {live ? (
        <>
          <View style={s.track} aria-hidden>
            {Array.from({ length: 12 }, (_, i) => <View key={i} style={[s.cell, i < filled && { backgroundColor: color.go }]} />)}
          </View>
          <View style={s.trackL}>
            <Text style={s.trackText}>ผ่านไป <Text style={s.trackNum}>{dur(minutes - start)}</Text></Text>
            <Text style={s.trackText}>เหลือ <Text style={s.trackNum}>{dur(end - minutes)}</Text></Text>
          </View>
          <View style={s.seg} role="group" aria-label="เช็กชื่อ">
            {(["present", "absent"] as const).map((st, i) => (
              <Pressable key={st} onPress={() => onCheck(st)} accessibilityRole="button" accessibilityState={{ selected: status === st }}
                style={[s.segBtn, i > 0 && s.segBorder, status === st && { backgroundColor: color.go }]}>
                <Text style={[s.segText, status === st && { color: color.paper }]}>{st === "present" ? "มาเรียน" : "ขาด"}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => onCheck("no_class")} style={s.link} accessibilityRole="button"
            accessibilityState={{ selected: status === "no_class" }}>
            <Text style={[s.linkText, status === "no_class" && { color: color.warn }]}>
              {status === "no_class" ? "บันทึกแล้ว: วันนี้อาจารย์งดสอน" : "วันนี้อาจารย์งดสอน"}
            </Text>
          </Pressable>
        </>
      ) : (
        <Text style={s.countdown}>เริ่มในอีก <Text style={s.countNum}>{dur(start - minutes)}</Text> ชม.</Text>
      )}
    </View>
  );
}

const pad = 20;
const s = StyleSheet.create({
  page: { paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  masthead: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.md,
    paddingHorizontal: pad, paddingTop: 14, paddingBottom: 14, backgroundColor: color.navyDeep, borderBottomWidth: 3, borderBottomColor: color.go,
  },
  h2: { fontFamily: font.headingBold, fontSize: 30, lineHeight: 36, color: color.go },
  meta: { fontFamily: font.body, fontSize: 14, color: color.onNavyMuted, marginTop: 2 },

  now: { paddingHorizontal: pad, paddingTop: 18, paddingBottom: 20, backgroundColor: color.navy },
  state: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, backgroundColor: color.go },
  stateText: { fontFamily: font.bodyBold, fontSize: 13, color: color.go },
  label: { fontFamily: font.body, fontSize: 13, color: color.onNavyFaint, marginTop: space.md },
  clockWrap: { alignSelf: "flex-start", marginTop: 8, marginBottom: 2 },
  clock: { fontFamily: font.num, fontSize: 64, lineHeight: 60, color: "#FFFFFF" },
  clockSmall: { fontSize: 30, color: color.onNavyMuted },
  scan: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(30,61,116,0.5)" },
  subject: { fontFamily: font.heading, fontSize: 22, lineHeight: 30, color: color.onNavy },
  where: { fontFamily: font.body, fontSize: 14, color: color.onNavyMuted },
  track: { flexDirection: "row", gap: 2, marginTop: 14, marginBottom: 6 },
  cell: { flex: 1, height: 6, backgroundColor: color.navyRule },
  trackL: { flexDirection: "row", justifyContent: "space-between" },
  trackText: { fontFamily: font.body, fontSize: 13, color: color.onNavyFaint },
  trackNum: { fontFamily: font.num, fontSize: 18, color: color.onNavyMuted },
  seg: { flexDirection: "row", marginTop: 16, borderWidth: 1, borderColor: color.navyRule },
  segBtn: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" },
  segBorder: { borderLeftWidth: 1, borderLeftColor: color.navyRule },
  segText: { fontFamily: font.heading, fontSize: 15, color: color.onNavy },
  link: { alignSelf: "center", minHeight: minTouch, justifyContent: "center", paddingHorizontal: 12, marginTop: 10 },
  linkText: { fontFamily: font.bodyMedium, fontSize: 14, color: color.onNavyMuted, textDecorationLine: "underline" },
  countdown: { fontFamily: font.body, fontSize: 15, color: color.onNavyMuted, marginTop: 2 },
  countNum: { fontFamily: font.num, fontSize: 22, color: color.onNavy },

  h: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: pad, paddingTop: 24, paddingBottom: 8 },
  hTitle: { fontFamily: font.heading, fontSize: 16, color: color.paper },
  hSide: { fontFamily: font.body, fontSize: 13, color: color.faint },
  entry: {
    flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: pad, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: color.rule,
  },
  rule: { height: 1, backgroundColor: color.rule },
  t: { width: 52, fontFamily: font.num, fontSize: 19, lineHeight: 23, color: color.faint },
  what: { fontFamily: font.bodyMedium, fontSize: 15, color: color.paper },
  sub: { fontFamily: font.body, fontSize: 13, color: color.muted },
  doneText: { textDecorationLine: "line-through", color: color.muted },
  links: { flexDirection: "row", gap: space.md, marginTop: 2 },
  miniLink: { minHeight: minTouch, justifyContent: "center" },
  miniText: { fontFamily: font.body, fontSize: 13, color: color.muted, textDecorationLine: "underline" },
  act: { minHeight: minTouch, paddingHorizontal: 16, borderWidth: 1, borderColor: color.warn, justifyContent: "center" },
  actText: { fontFamily: font.heading, fontSize: 14, color: color.warn },
  // ช่องติ๊ก 22px แต่พื้นที่กด 44 (ดึงขอบออกด้วย margin ลบ ให้แถวไม่สูงเกิน)
  tick: { width: 44, height: 44, marginVertical: -11, marginLeft: -11, marginRight: 52 - 33, alignItems: "center", justifyContent: "center" },
  box: { width: 22, height: 22, borderWidth: 2, borderColor: color.muted },
  boxOn: { backgroundColor: color.go, borderColor: color.navy },
  due: { fontFamily: font.heading, fontSize: 15, lineHeight: 18 },
  dueSmall: { fontFamily: font.body, fontSize: 12, color: color.faint },
  dueTime: { fontFamily: font.num, fontSize: 16 },

  sum: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52, marginTop: 20,
    paddingHorizontal: pad, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.rule,
  },
  sumText: { fontFamily: font.body, fontSize: 14, color: color.muted },
  sumXp: { fontFamily: font.num, fontSize: 19, color: color.navy },

  toast: {
    position: "absolute", left: 12, right: 12, bottom: 12, maxWidth: 536, alignSelf: "center",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
    backgroundColor: color.paper, paddingVertical: 6, paddingRight: 6, paddingLeft: 16,
  },
  toastText: { flex: 1, fontFamily: font.body, fontSize: 14, color: color.onNavy },
  toastBtn: { minHeight: minTouch, paddingHorizontal: 14, backgroundColor: color.go, justifyContent: "center" },
  toastBtnText: { fontFamily: font.heading, fontSize: 14, color: color.paper },
});
