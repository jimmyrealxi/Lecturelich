import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, Card, Crt, Skeleton, T, Tick } from "@/components/ui";
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
import { dueInfo, dur, hhmm, typedDate, weekdayName } from "@/lib/format";
import { color, font, minTouch, radius, space } from "@/lib/theme";
import { XP_CONFIG } from "@/lib/xp";

// หน้าวันนี้ ธีม A (docs/mockups/a-today.html) · จอเขียวแปะเทปเฉพาะคาบตอนนี้/ถัดไป · ตรายางแดงอันเดียว (งานด่วนสุด)
// ป้ายนูนอันเดียว (LECTURELICH) · XP วันนี้เป็นบรรทัดลิงก์ไปหน้าเกม · มุมขวาบนเว้นที่ Pap-Boy (ตอนนี้ LvChip)

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
  // งานที่เพิ่งติ๊กในหน้านี้ ยังโชว์ไว้ (ไม่หายวับ) · toast = ยกเลิกได้ 3 วิ
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
  const nextAfter = focus?.state === "live" ? today.find((x) => toMinutes(x.start_time) >= toMinutes(focus.slot.end_time)) : undefined;
  // ตรายางแดงจุดเดียวต่อจอ = งานด่วนสุด (ส่งภายในพรุ่งนี้ หรือเลยกำหนด)
  const urgent = openTasks.find((a) => !a.done && a.due_at && dueInfo(a.due_at, now.date).days <= 1);
  const noteSlot = focus?.state === "live" ? focus.slot : unnoted[0];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 8 }]}>
        <View style={s.mast}>
          <View style={{ flexShrink: 1 }}>
            <Text style={s.dymo}>LECTURELICH</Text>
            <Text style={s.h2} accessibilityRole="header">{weekdayName(now.date)}</Text>
            {/* "เทอม 2/2569" ห้ามแยกบรรทัด (u00a0 = ช่องว่างไม่ตัดบรรทัด) */}
            <Text style={s.date}>{typedDate(now.date)}{termLabel ? <Text style={s.dateTerm}>{` · ${termLabel.replace(/ /g, "\u00a0")}`}</Text> : null}</Text>
          </View>
          <LvChip />
        </View>

        {loading ? (
          <View style={{ paddingTop: space.lg }}><Skeleton height={170} /><Skeleton height={120} /></View>
        ) : !term.data ? (
          <View style={{ paddingTop: space.lg }}>
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
              <Screen
                slot={focus.slot} live={focus.state === "live"} minutes={now.minutes}
                subject={subjectById.get(focus.slot.subject_id)} status={statusToday.get(focus.slot.id)}
                onCheck={(st) => check(focus.slot, st)}
              />
            ) : (
              <View style={s.free}>
                <Text style={s.freeTitle}>{today.length ? "หมดคาบแล้ววันนี้" : "วันนี้ไม่มีคาบเรียน"}</Text>
                <Text style={s.freeText}>
                  {nearest?.due_at ? (
                    <>งานใกล้สุด: {nearest.title} ส่ง{dueInfo(nearest.due_at, now.date).day} <Text style={s.ty}>{dueInfo(nearest.due_at, now.date).time}</Text></>
                  ) : "ไม่มีงานค้าง พักได้"}
                </Text>
              </View>
            )}
            {nextAfter && (
              <Text style={s.next}>ถัดไป <Text style={s.ty}>{hhmm(nextAfter.start_time)}</Text> {subjName(nextAfter.subject_id)}{nextAfter.room ? ` · ${nextAfter.room}` : ""}</Text>
            )}

            <View style={s.h}>
              <Text style={s.hTitle} accessibilityRole="header">ต้องทำ</Text>
              <Text style={s.hSide}><Text style={s.tyMuted}>{unnoted.length + openTasks.filter((a) => !a.done).length}</Text> เรื่อง</Text>
            </View>

            {unnoted.map((slot) => (
              <View key={slot.id} style={s.entry}>
                <Text style={s.t}>{hhmm(slot.start_time)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.what}>จดหลังคาบ {subjName(slot.subject_id)}</Text>
                  <Text style={s.sub}>จดวันนี้ได้ <Text style={s.ty}>+{XP_CONFIG.note}</Text> XP · มีรูป <Text style={s.ty}>+{XP_CONFIG.notePhoto}</Text></Text>
                  <View style={s.links}>
                    {(["absent", "no_class"] as const).map((st) => (
                      <Pressable key={st} onPress={() => check(slot, st)} style={s.miniLink} accessibilityRole="button"
                        accessibilityState={{ selected: statusToday.get(slot.id) === st }}>
                        <Text style={[s.miniText, statusToday.get(slot.id) === st && s.miniOn]}>
                          {statusToday.get(slot.id) === st ? "บันทึกแล้ว: " : ""}{st === "absent" ? "ขาดคาบนี้" : "งดสอน"}
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
              <Skeleton height={44} />
            ) : (
              openTasks.map((a) => {
                const due = a.due_at ? dueInfo(a.due_at, now.date) : null;
                const when = due && !a.done ? (due.days <= 1 ? `${due.day} ${due.time}` : `อีก ${due.days} วัน`) : null;
                return (
                  <View key={a.id} style={s.entry}>
                    <Pressable onPress={() => tick(a)} style={s.tick} accessibilityRole="checkbox"
                      accessibilityState={{ checked: a.done }} accessibilityLabel={`ทำเครื่องหมายว่าส่งแล้ว: ${a.title}`}>
                      <View style={[s.box, a.done && { borderColor: color.pen }]}>{a.done && <Tick />}</View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.what, a.done && s.doneText]}>{a.title}</Text>
                      <Text style={[s.sub, a.done && s.doneText, !!due && !a.done && due.days < 0 && { color: color.danger }]}>
                        {a.done ? "ส่งแล้ว" : a.subject_id ? subjName(a.subject_id) : "ไม่ผูกวิชา"}{when ? ` · ${when}` : ""}
                      </Text>
                    </View>
                    {a === urgent && due && <Text style={s.stamp}>{due.days < 0 ? "เลยกำหนด" : `${due.day}!`}</Text>}
                  </View>
                );
              })
            )}
            {!tasks.isPending && unnoted.length + openTasks.length === 0 && (
              <View style={s.entry}><Text style={s.sub}>ไม่มีอะไรค้าง</Text></View>
            )}
            <View style={s.rule} />

            <View style={s.qa} role="group" aria-label="ทางลัด">
              {noteSlot && (
                <Quick label="จด" icon="note" onPress={() => router.push({ pathname: "/note/[slotId]", params: { slotId: noteSlot.id, date: now.date } })} />
              )}
              <Quick label="เพิ่มงาน" icon="plus" onPress={() => router.push("/tasks")} />
              <Quick label="ตาราง" icon="today" onPress={() => router.push("/subjects")} />
            </View>

            <Pressable style={s.sum} onPress={() => router.push("/game")} accessibilityRole="link"
              accessibilityLabel="ดู XP ที่ได้วันนี้ ไปหน้าเกม">
              <Text style={s.sumText}>
                {xpToday.data?.xp
                  ? <>วันนี้ได้ <Text style={s.ty}>+{xpToday.data.xp}</Text> XP · <Text style={s.ty}>{xpToday.data.count}</Text> รายการ</>
                  : "วันนี้ยังไม่ได้ XP"}
              </Text>
              <Text style={s.sumLink}>หน้าเกม ›</Text>
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

const QICON = {
  note: <><path d="M5 3h10l4 4v14H5z" strokeLinejoin="round" /><path d="M8 11h8M8 15h8M8 7h5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  today: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
};

/** ปุ่มลัด: กระดาษ + ขอบหมึก + เงาแข็ง 2px (กดแล้วจม) */
function Quick({ label, icon, onPress }: { label: string; icon: keyof typeof QICON; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.quick, pressed && s.quickDown]}>
      {Platform.OS === "web" && (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.paper} strokeWidth={2} aria-hidden>{QICON[icon]}</svg>
      )}
      <Text style={s.quickText}>{label}</Text>
    </Pressable>
  );
}

const LABEL: Record<AttendanceStatus, string> = { present: "มาเรียน", absent: "ขาด", no_class: "งดสอน" };
/** นาที → "14" นาที หรือ "1:46" ชม. */
const left = (min: number) => (min < 60 ? { n: String(Math.max(0, min)), unit: "นาที" } : { n: dur(min), unit: "ชม." });

/** จอเขียวแปะเทป (จุดเดียวต่อจอ): คาบตอนนี้ + เช็กชื่อ / คาบถัดไป + นับถอยหลัง */
function Screen({ slot, live, minutes, subject, status, onCheck }: {
  slot: Slot; live: boolean; minutes: number; subject?: { name: string; code: string | null };
  status?: AttendanceStatus; onCheck: (st: AttendanceStatus) => void;
}) {
  const start = toMinutes(slot.start_time);
  const end = toMinutes(slot.end_time);
  const rest = left(live ? end - minutes : start - minutes);
  const where = [subject?.code, slot.room].filter(Boolean).join(" · ");
  return (
    <Crt style={{ marginTop: 26 }}>
      <View accessibilityLabel={live ? "คาบที่กำลังเรียน" : "คาบถัดไป"}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.k}>{live ? "> คาบตอนนี้" : "> คาบถัดไป"}</Text>
            <Text style={s.subj}>{subject?.name ?? "วิชา"}</Text>
            <Text style={s.meta}><Text style={s.vt}>{hhmm(slot.start_time)}–{hhmm(slot.end_time)}</Text>{where ? ` · ${where}` : ""}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.k}>{live ? "เหลือ" : "อีก"}</Text>
            <Text style={s.big}>{rest.n}</Text>
            <Text style={s.k}>{rest.unit}</Text>
          </View>
        </View>
        {live && (
          <>
            <View style={s.att} role="group" aria-label="เช็กชื่อคาบนี้">
              {(["present", "absent", "no_class"] as const).map((st) => (
                <Pressable key={st} onPress={() => onCheck(st)} accessibilityRole="button" accessibilityState={{ selected: status === st }}
                  style={({ pressed }) => [s.attBtn, status === st && s.attOn, pressed && { transform: [{ scale: 0.97 }] }]}>
                  <Text style={[s.attText, status === st && { color: color.crt }, !!status && status !== st && { color: color.crtDim }]}>{LABEL[st]}</Text>
                </Pressable>
              ))}
            </View>
            {status && (
              <View style={s.saved}>
                <Text style={s.k}>บันทึกแล้ว: <Text style={{ color: color.crtOn, fontFamily: font.bodyBold }}>{LABEL[status]}</Text></Text>
                {status === "present" && <Text style={s.k}><Text style={s.vt}>+{XP_CONFIG.attend}</Text> XP</Text>}
              </View>
            )}
          </>
        )}
      </View>
    </Crt>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 96, width: "100%", maxWidth: 560, alignSelf: "center" },
  mast: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.md, paddingBottom: 12,
    borderBottomWidth: 3, borderBottomColor: "rgba(42,33,24,0.75)", borderStyle: "double" as "solid",
  },
  // ป้ายพิมพ์นูน (จุดเดียวต่อจอ) · letter-spacing ได้เพราะเป็นตัวอังกฤษ
  dymo: {
    alignSelf: "flex-start", backgroundColor: "#1A1A1A", color: "#F2F2F2", fontFamily: font.typeBold, fontSize: 12, lineHeight: 14,
    letterSpacing: 2, paddingHorizontal: 9, paddingTop: 5, paddingBottom: 4, borderRadius: 2,
    textShadowColor: "#000", textShadowOffset: { width: 0, height: -1 }, textShadowRadius: 0,
  },
  h2: { fontFamily: font.title, fontSize: 32, lineHeight: 44, color: color.paper, marginTop: 6 },
  date: { fontFamily: font.typeBold, fontSize: 15, color: color.paper },
  dateTerm: { fontFamily: font.bodyMedium },

  k: { fontFamily: font.body, fontSize: 13, color: color.crtDim },
  subj: { fontFamily: font.bodyBold, fontSize: 19, lineHeight: 26, color: color.crtOn, marginTop: 2 },
  meta: { fontFamily: font.body, fontSize: 13, color: color.crtDim, marginTop: 2 },
  vt: { fontFamily: font.num, fontSize: 19, color: color.crtOn },
  big: { fontFamily: font.num, fontSize: 36, lineHeight: 36, color: "#B8FFC9" },
  att: { flexDirection: "row", gap: 8, marginTop: 14 },
  attBtn: { flex: 1, minHeight: minTouch, borderWidth: 1, borderColor: "#2F6B42", borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  attOn: { backgroundColor: color.crtOn, borderColor: color.crtOn },
  attText: { fontFamily: font.bodyBold, fontSize: 15, color: color.crtOn },
  saved: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },

  next: { fontFamily: font.body, fontSize: 14, color: color.muted, marginTop: 12 },
  free: { marginTop: 26 },
  freeTitle: { fontFamily: font.title, fontSize: 19, lineHeight: 28, color: color.paper },
  freeText: { fontFamily: font.body, fontSize: 14, color: color.muted, marginTop: 2 },
  ty: { fontFamily: font.typeBold, color: color.paper },
  tyMuted: { fontFamily: font.typeBold, color: color.muted },

  h: { flexDirection: "row", alignItems: "baseline", gap: 10, paddingTop: 30, paddingBottom: 4 },
  hTitle: { fontFamily: font.title, fontSize: 19, lineHeight: 28, color: color.paper },
  hSide: { fontFamily: font.body, fontSize: 13, color: color.faint },
  entry: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.rule },
  rule: { height: 1, backgroundColor: color.rule },
  t: { width: 44, fontFamily: font.typeBold, fontSize: 14, color: color.warn, alignSelf: "flex-start", marginTop: 2 },
  what: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 21, color: color.paper },
  sub: { fontFamily: font.body, fontSize: 13, color: color.muted },
  doneText: { color: color.faint }, // ไม่ขีดฆ่า: เส้นทับสระบนไทยอ่านยาก
  links: { flexDirection: "row", gap: space.lg },
  miniLink: { minHeight: minTouch, justifyContent: "center" },
  miniText: { fontFamily: font.body, fontSize: 13, color: color.muted, textDecorationLine: "underline" },
  miniOn: { color: color.pen, fontFamily: font.bodyBold, textDecorationLine: "none" },
  act: { minHeight: minTouch, paddingHorizontal: 16, borderWidth: 1.5, borderColor: color.paper, borderRadius: radius.sm, justifyContent: "center" },
  actText: { fontFamily: font.bodyBold, fontSize: 14, color: color.paper },
  // ช่องติ๊ก 22px (วาดมือ) แต่พื้นที่กด 44
  tick: { width: 44, height: 44, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  box: {
    width: 22, height: 22, borderWidth: 2, borderColor: color.paper, alignItems: "center", justifyContent: "center",
    borderTopLeftRadius: 2, borderTopRightRadius: 4, borderBottomRightRadius: 3, borderBottomLeftRadius: 2,
  },
  // ตรายาง (จุดเดียวต่อจอ)
  stamp: {
    fontFamily: font.bodyBold, fontSize: 13, color: color.red, borderWidth: 2, borderColor: color.red, borderRadius: 4,
    paddingHorizontal: 9, paddingVertical: 1, transform: [{ rotate: "-6deg" }], opacity: 0.92,
  },

  qa: { flexDirection: "row", gap: 10, marginTop: 22 },
  quick: {
    flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: color.deck,
    borderWidth: 1.5, borderColor: color.paper, borderRadius: radius.sm, boxShadow: `2px 2px 0 ${color.paper}`,
  },
  quickDown: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: "none" },
  quickText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.paper },

  sum: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48, marginTop: 18, borderTopWidth: 1, borderColor: color.rule },
  sumText: { fontFamily: font.body, fontSize: 14, color: color.muted },
  sumLink: { fontFamily: font.bodyBold, fontSize: 14, color: color.pen },

  toast: {
    position: "absolute", left: 12, right: 12, bottom: 12, maxWidth: 536, alignSelf: "center",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: radius.sm,
    backgroundColor: color.paper, paddingVertical: 6, paddingRight: 6, paddingLeft: 14,
  },
  toastText: { flex: 1, fontFamily: font.body, fontSize: 14, color: color.on },
  toastBtn: { minHeight: minTouch, paddingHorizontal: 14, justifyContent: "center" },
  toastBtnText: { fontFamily: font.bodyBold, fontSize: 14, color: color.go },
});
