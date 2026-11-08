import { useTabTop } from "@/lib/useTabTop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, Card, confirmAction, Crt, CrtBig, CrtLabel, PenScribble, Readout, Section, Skeleton, T, Tick, UndoBar } from "@/components/ui";
import { CrtStage, useCrtFx } from "@/components/game/CrtFx";
import { PapBoyBuddy } from "@/components/game/PapBoySprite";
import { KIND, statusOf } from "@/components/game/Review";
import {
  useAssignments, useAttendance, useCurrentTerm, useSetAttendance, useSetDayOff, useSlots, useSubjects, useToggleDone,
  type AttendanceRow, type Assignment,
} from "@/lib/queries/core";
import { useLoot } from "@/lib/queries/loot";
import { useNotedSlots } from "@/lib/queries/notes";
import { useExams, useReviewTopic, useTopics, type TopicFull } from "@/lib/queries/review";
import { useProfile } from "@/lib/queries/setup";
import { useXpToday } from "@/lib/queries/xp";
import { daysUntil, examReady, nearExam, reviewQueue } from "@/lib/review";
import { useNow } from "@/lib/useNow";
import {
  attendanceStats, countSessions, currentOrNext, endedWithoutNote, slotsOn, toMinutes, type AttendanceStatus, type Slot,
} from "@/lib/schedule";
import { countdown, dueInfo, hhmm, typedDate, weekdayName } from "@/lib/format";
import { DEFAULT_LOOK, type Pose } from "@/lib/papboy";
import { color, crtGlow, font, minTouch, radius, space } from "@/lib/theme";
import { XP_CONFIG } from "@/lib/xp";

// หน้าวันนี้ ธีม A (docs/mockups/a-today.html) · จอเขียวแปะเทปเฉพาะคาบตอนนี้/ถัดไป · ตรายางแดงอันเดียว (งานด่วนสุด)
// ป้ายนูนอันเดียว (LECTURELICH) · XP วันนี้เป็นบรรทัดลิงก์ไปหน้าเกม · มุมขวาบน Pap-Boy เปลี่ยนท่าตามสิ่งที่ทำ (docs/mockups/inspire-anim.html)

export default function Today() {
  const top = useTabTop();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const attendance = useAttendance(term.data);
  const tasks = useAssignments();
  const setAttendance = useSetAttendance(term.data?.id ?? "");
  const setDayOff = useSetDayOff(term.data?.id ?? "");
  const minPct = useProfile().data?.min_attendance_pct ?? 80;
  const toggle = useToggleDone();
  const xpToday = useXpToday(now.date);
  const look = useLoot().data?.look ?? DEFAULT_LOOK;
  // เปิดหน้า = แบห้านิ้ว แล้วกลับไปนั่งอ่าน · n แยกการทำซ้ำท่าเดิม
  const [buddy, setBuddy] = useState<{ pose: Pose; say: string; n: number }>({ pose: "palm", say: "", n: 0 });
  const act = useCallback((pose: Pose, say: string) => setBuddy((b) => ({ pose, say, n: b.n + 1 })), []);
  useEffect(() => {
    if (buddy.pose === "read") return;
    const hush = setTimeout(() => setBuddy((b) => ({ ...b, say: "" })), 1300);
    const idle = setTimeout(() => setBuddy((b) => ({ ...b, pose: "read" })), buddy.n ? 1600 : 2400);
    return () => { clearTimeout(hush); clearTimeout(idle); };
  }, [buddy.pose, buddy.n]);
  // กด "จด" แล้วจอโน้ตบังหน้านี้ → โชว์ท่าเขียนตอนกลับมา
  const fromNote = useRef(false);
  useFocusEffect(useCallback(() => {
    if (fromNote.current) { fromNote.current = false; act("write", "จด ๆ"); }
  }, [act]));
  const openNote = (slotId: string) => {
    fromNote.current = true;
    router.push({ pathname: "/note/[slotId]", params: { slotId, date: now.date } });
  };
  // งานที่เพิ่งติ๊กในหน้านี้ ยังโชว์ไว้ (ไม่หายวับ) · toast = ยกเลิกได้ 3 วิ
  const [ticked, setTicked] = useState<string[]>([]);
  const [toast, setToast] = useState<Assignment | null>(null);

  const subjectById = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s])), [subjects.data]);
  const today = useMemo(() => slotsOn(now.date, slots.data ?? [], term.data ?? null), [now.date, slots.data, term.data]);
  const statusToday = useMemo(
    () => new Map((attendance.data ?? []).filter((r) => r.date === now.date).map((r) => [r.slot_id, r.status])),
    [attendance.data, now.date],
  );
  const noted = useNotedSlots(now.date);
  const dayOff = today.length >= 2 && today.every((x) => statusToday.get(x.id) === "no_class");
  const focus = dayOff ? null : currentOrNext(today, now.minutes);
  const notedSet = useMemo(() => new Set(noted.data ?? []), [noted.data]);
  // ยังโหลดไม่เสร็จ = ยังไม่โชว์ (กันบรรทัดแวบขึ้นแล้วหาย)
  const unnoted = noted.data ? endedWithoutNote(today, now.minutes, notedSet, statusToday) : [];
  const openTasks = (tasks.data ?? []).filter((a) => !a.done || ticked.includes(a.id)).slice(0, 5);
  const nearest = (tasks.data ?? []).find((a) => !a.done && a.due_at);
  const subjName = (id: string | null) => (id && subjectById.get(id)?.name) || "วิชา";

  const check = (slot: Slot, status: AttendanceStatus) => {
    setAttendance.mutate({ slot_id: slot.id, subject_id: slot.subject_id, date: now.date, status } as AttendanceRow);
    if (status === "present") act("hand", "มาแล้วครับ!");
  };
  /** ข้อความในภาพตอนกด "ขาด": นับรวมคาบนี้เป็นขาดแล้ว */
  const absentLeft = (slot: Slot) => {
    const mine = (slots.data ?? []).filter((x) => x.subject_id === slot.subject_id);
    const rows = (attendance.data ?? []).filter((r) => r.subject_id === slot.subject_id && !(r.slot_id === slot.id && r.date === now.date));
    const { remaining } = attendanceStats([...rows.map((r) => r.status), "absent"], term.data ? countSessions(mine, term.data) : 0, minPct);
    return remaining >= 0 ? `ขาดได้อีก ${remaining}` : `เกินเกณฑ์ ${-remaining}`;
  };
  const toggleDayOff = () => {
    const go = () => setDayOff.mutate({ slots: today, date: now.date, off: !dayOff });
    // เช็กชื่อไว้แล้ว (มาเรียน/ขาด) จะถูกเขียนทับ ต้องถามก่อน
    if (!dayOff && today.some((x) => statusToday.has(x.id) && statusToday.get(x.id) !== "no_class")) {
      confirmAction("มีคาบที่เช็กชื่อแล้ว เปลี่ยนเป็นงดสอนทั้งหมด?", go);
    } else go();
  };
  const tick = (a: Assignment) => {
    if (a.id.startsWith("temp-")) return;
    toggle.mutate({ id: a.id, done: !a.done });
    if (!a.done) {
      setTicked((t) => [...t, a.id]);
      setToast(a);
      act("cheer", "ส่งแล้ว!");
    } else setToast(null);
  };
  const undo = () => {
    if (!toast) return;
    toggle.mutate({ id: toast.id, done: false });
    setToast(null);
  };

  const loading = term.isPending || (term.data && (slots.isPending || subjects.isPending));
  const [dd, mon, yy] = typedDate(now.date).split(" "); // Courier Prime ไม่มีตัวไทย → เดือนต้องใช้ฟอนต์ไทย
  const termLabel = term.data ?(term.data.name.includes("เทอม") ? term.data.name : `เทอม ${term.data.name}`) : null;
  const nextAfter = focus?.state === "live" ? today.find((x) => toMinutes(x.start_time) >= toMinutes(focus.slot.end_time)) : undefined;
  // ตรายางแดงจุดเดียวต่อจอ = งานด่วนสุด (ส่งภายในพรุ่งนี้ หรือเลยกำหนด)
  const urgent = openTasks.find((a) => !a.done && a.due_at && dueInfo(a.due_at, now.date).days <= 1);
  const noteSlot = focus?.state === "live" ? focus.slot : unnoted[0];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={top} contentContainerStyle={[s.page, { paddingTop: insets.top + 8 }]}>
        <View style={s.mast}>
          <View style={{ flexShrink: 1 }}>
            <Text style={s.dymo}>LECTURELICH</Text>
            <Text style={s.h2} accessibilityRole="header">{weekdayName(now.date)}</Text>
            {/* "เทอม 2/2569" ห้ามแยกบรรทัด (u00a0 = ช่องว่างไม่ตัดบรรทัด) */}
            <Text style={s.date}>{dd} <Text style={s.dateTerm}>{mon}</Text> {yy}{termLabel ? <Text style={s.dateTerm}>{` · ${termLabel.replace(/ /g, "\u00a0")}`}</Text> : null}</Text>
          </View>
          <Pressable onPress={() => act("palm", "หวัดดี! พักบ้างนะ")} style={s.buddy} accessibilityRole="button" accessibilityLabel="Pap-Boy กดเพื่อทักทาย">
            <PapBoyBuddy look={look} pose={buddy.pose} />
          </Pressable>
          {!!buddy.say && <Bubble key={buddy.n} text={buddy.say} />}
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
                onCheck={(st) => check(focus.slot, st)} absentLeft={() => absentLeft(focus.slot)}
              />
            ) : (
              <Crt style={{ marginTop: 26 }}>
                <CrtLabel>ตอนนี้ว่าง</CrtLabel>
                <Text style={s.subj}>{dayOff ? "วันนี้งดสอนทั้งวัน" : today.length ? "หมดคาบแล้ววันนี้" : "วันนี้ไม่มีคาบเรียน"}</Text>
                <Text style={s.meta}>
                  {nearest?.due_at ? (
                    <>งานใกล้สุด: {nearest.title} ส่ง{dueInfo(nearest.due_at, now.date).day} <Text style={s.vt}>{dueInfo(nearest.due_at, now.date).time}</Text></>
                  ) : "ไม่มีงานค้าง พักได้"}
                </Text>
              </Crt>
            )}
            {nextAfter && (
              <Text style={s.next}>ถัดไป <Text style={s.ty}>{hhmm(nextAfter.start_time)}</Text> {subjName(nextAfter.subject_id)}{nextAfter.room ? ` · ${nextAfter.room}` : ""}</Text>
            )}
            {today.length >= 2 && (
              <Pressable onPress={toggleDayOff} style={s.dayOffLink} accessibilityRole="button" accessibilityState={{ selected: dayOff }}>
                <Text style={[s.dayOffText, dayOff && s.miniOn]}>{dayOff ? "บันทึกแล้ว: งดสอนทั้งวัน" : "วันนี้งดสอนทั้งวัน"}</Text>
              </Pressable>
            )}

            <Section count={{ n: unnoted.length + (tasks.data ?? []).filter((a) => !a.done).length, unit: "เรื่อง" }}>ต้องทำ</Section>

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
                  onPress={() => openNote(slot.id)}>
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

            <TodayReview termId={term.data.id} today={now.date} nameOf={subjName} />

            <View style={s.qa} role="group" aria-label="ทางลัด">
              {noteSlot && (
                <Quick label="จด" icon="note" onPress={() => openNote(noteSlot.id)} />
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

      {toast && <UndoBar key={toast.id} text={`ส่ง “${toast.title}” แล้ว`} onUndo={undo} onClose={setToast} />}
    </View>
  );
}

/** ทวนวันนี้ (docs/mockups/a-today-review.html) · ไม่มีหัวข้อต้องทวน = ซ่อนทั้งส่วน */
function TodayReview({ termId, today, nameOf }: { termId: string; today: string; nameOf: (id: string) => string }) {
  const topics = useTopics(termId).data ?? [];
  const exams = useExams(termId).data ?? [];
  const review = useReviewTopic(termId);
  const [open, setOpen] = useState(false);
  // เก็บค่าก่อนกด: แถวที่เพิ่งทวนอยู่ที่เดิมจนออกจากหน้า ไม่หายวับ
  const [pressed, setPressed] = useState<TopicFull[]>([]);
  useFocusEffect(useCallback(() => () => setPressed([]), []));
  const press = (t: TopicFull) => {
    setPressed((p) => [...p, t]);
    // mutateAsync: กดหลายแถวติดกัน แต่ละแถวต้องย้อนเองได้ถ้าบันทึกไม่สำเร็จ
    review.mutateAsync(t.id).catch(() => setPressed((p) => p.filter((x) => x.id !== t.id)));
  };

  const queue = reviewQueue(topics.map((t) => pressed.find((p) => p.id === t.id) ?? t), exams, today);
  if (!queue.length) return null;

  const exam = nearExam(exams, today);
  const ready = exam ? examReady(exam, exams, topics) : null;
  const days = exam ? daysUntil(exam.date, today) : 0;
  const left = queue.filter((t) => !pressed.some((p) => p.id === t.id)).length;
  const firstLate = queue.find((t) => statusOf(t, today).late)?.id;

  return (
    <View role="region" aria-label="ทวนวันนี้">
      <Section count={{ n: left, unit: "หัวข้อ" }}>ทวนวันนี้</Section>
      {exam && (
        <View style={s.examRow}>
          <Text style={s.exam}>
            <Text style={s.examName}>{KIND[exam.kind]} {nameOf(exam.subject_id)}</Text>
            {"\n"}{days === 0 ? "สอบวันนี้" : <>อีก <Text style={s.ty}>{days}</Text> วัน</>}
            {ready !== null && " · พร้อมสอบ"}
          </Text>
          {ready !== null && <Readout>{ready}%</Readout>}
        </View>
      )}
      {(open ? queue : queue.slice(0, 3)).map((t) => {
        const st = statusOf(t, today);
        return (
          <View key={t.id} style={s.entry}>
            <Pressable style={s.reviewOpen} onPress={() => router.push(`/subject/${t.subject_id}`)} accessibilityRole="link"
              accessibilityLabel={`${t.is_starred ? "ออกสอบ " : ""}${t.title} ${st.text} เปิดหน้าวิชา ${nameOf(t.subject_id)}`}>
              <Text style={s.what}>{t.is_starred && <Text style={s.star}>★ </Text>}{t.title}</Text>
              <Text style={s.sub}>{nameOf(t.subject_id)} · <Text style={st.late && s.late}>{st.text}</Text></Text>
              {t.id === firstLate && <PenScribble />}
            </Pressable>
            {pressed.some((p) => p.id === t.id) ? (
              <View style={s.reviewed}><Tick /><Text style={s.reviewedText}>ทวนแล้ว</Text></View>
            ) : (
              <Pressable style={s.act} onPress={() => press(t)} accessibilityRole="button" accessibilityLabel={`ทวน ${t.title} แล้ว`}>
                <Text style={s.actText}>ทวนแล้ว</Text>
              </Pressable>
            )}
          </View>
        );
      })}
      {!open && queue.length > 3 ? (
        <Pressable style={s.more} onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={s.moreText}>ดูอีก {queue.length - 3} หัวข้อ</Text>
        </Pressable>
      ) : <View style={s.rule} />}
    </View>
  );
}

/** ป้ายพูด Pap-Boy · เฟดเข้าอย่างเดียว (ไม่ขยับ จึงไม่ต้องแยกกรณีลดการเคลื่อนไหว) */
function Bubble({ text }: { text: string }) {
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  }, [fade]);
  return <Animated.Text style={[s.bubble, { opacity: fade }]} accessibilityLiveRegion="polite" pointerEvents="none">{text}</Animated.Text>;
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
/** จอเขียวแปะเทป (จุดเดียวต่อจอ): คาบตอนนี้ + เช็กชื่อ / คาบถัดไป + นับถอยหลัง */
function Screen({ slot, live, minutes, subject, status, onCheck, absentLeft }: {
  slot: Slot; live: boolean; minutes: number; subject?: { name: string; code: string | null };
  status?: AttendanceStatus; onCheck: (st: AttendanceStatus) => void; absentLeft: () => string;
}) {
  const fx = useCrtFx();
  const press = (st: AttendanceStatus) => {
    // กดซ้ำค่าเดิมไม่เล่นภาพ · บันทึกทันทีไม่รอภาพจบ
    if (st !== status) fx.start(st, st === "present" ? `+${XP_CONFIG.attend} XP` : st === "no_class" ? "ไม่นับขาด" : absentLeft());
    onCheck(st);
  };
  const start = toMinutes(slot.start_time);
  const end = toMinutes(slot.end_time);
  const rest = countdown(live ? end - minutes : start - minutes);
  const where = [subject?.code, slot.room].filter(Boolean).join(" · ");
  return (
    <Crt style={{ marginTop: 26 }} overlay={fx.play && <CrtStage key={fx.play.n} play={fx.play} onEnd={fx.stop} />}>
      <View accessibilityLabel={live ? "คาบที่กำลังเรียน" : "คาบถัดไป"}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <CrtLabel>{live ? "คาบตอนนี้" : "คาบถัดไป"}</CrtLabel>
            <View style={s.subjRow}>
              <Text style={s.subj}>{subject?.name ?? "วิชา"}</Text>
              {!!slot.makeup_date && <Text style={s.tag}>ชดเชย</Text>}
            </View>
            <Text style={s.meta}><Text style={s.vt}>{hhmm(slot.start_time)}–{hhmm(slot.end_time)}</Text>{where ? ` · ${where}` : ""}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.k}>{live ? "เหลือ" : "อีก"}</Text>
            <CrtBig text={rest.n} />
            <Text style={s.k}>{rest.unit}</Text>
          </View>
        </View>
        {live && (
          <>
            <View style={s.att} role="group" aria-label="เช็กชื่อคาบนี้">
              {(["present", "absent", "no_class"] as const).map((st) => (
                <Pressable key={st} onPress={() => press(st)} accessibilityRole="button" accessibilityState={{ selected: status === st }}
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
  buddy: { marginTop: -8, marginBottom: -8, marginRight: -6 },
  bubble: {
    position: "absolute", right: 86, top: 6, backgroundColor: color.field, borderWidth: 1.5, borderColor: color.paper, borderRadius: 3,
    fontFamily: font.bodyMedium, fontSize: 15, color: color.paper, paddingHorizontal: 10, paddingVertical: 3, transform: [{ rotate: "-2deg" }],
  },
  // ป้ายพิมพ์นูน (จุดเดียวต่อจอ) · letter-spacing ได้เพราะเป็นตัวอังกฤษ
  dymo: {
    alignSelf: "flex-start", backgroundColor: "#1A1A1A", color: "#F2F2F2", fontFamily: font.typeBold, fontSize: 12, lineHeight: 14,
    letterSpacing: 2, paddingHorizontal: 9, paddingTop: 5, paddingBottom: 4, borderRadius: 2,
    textShadowColor: "#000", textShadowOffset: { width: 0, height: -1 }, textShadowRadius: 0,
  },
  h2: { fontFamily: font.title, fontSize: 32, lineHeight: 44, color: color.paper, marginTop: 6 },
  date: { fontFamily: font.typeBold, fontSize: 16, color: color.paper },
  dateTerm: { fontFamily: font.bodyMedium },

  k: { fontFamily: font.body, fontSize: 15, color: color.crtDim, ...crtGlow.dim },
  subj: { fontFamily: font.bodyBold, fontSize: 19, lineHeight: 26, color: color.crtOn, marginTop: 2, ...crtGlow.title },
  subjRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6 },
  tag: { fontFamily: font.body, fontSize: 15, color: color.crtOn, borderWidth: 1, borderColor: "#2F6B42", borderRadius: 2, paddingHorizontal: 8, paddingVertical: 2 },
  meta: { fontFamily: font.body, fontSize: 15, color: color.crtDim, marginTop: 2 },
  vt: { fontFamily: font.num, fontSize: 19, color: color.crtOn },
  att: { flexDirection: "row", gap: 8, marginTop: 14 },
  attBtn: { flex: 1, minHeight: minTouch, borderWidth: 1, borderColor: "#2F6B42", borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  attOn: { backgroundColor: color.crtOn, borderColor: color.crtOn },
  attText: { fontFamily: font.bodyBold, fontSize: 16, color: color.crtOn },
  saved: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },

  next: { fontFamily: font.body, fontSize: 16, color: color.muted, marginTop: 12 },
  dayOffLink: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start", marginTop: 4 },
  dayOffText: { fontFamily: font.body, fontSize: 16, color: color.pen, textDecorationLine: "underline" },
  ty: { fontFamily: font.typeBold, color: color.paper },

  entry: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 68, paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.rule },
  rule: { height: 1, backgroundColor: color.rule },
  t: { width: 56, fontFamily: font.typeBold, fontSize: 16, color: color.warn, alignSelf: "flex-start", marginTop: 2 },
  what: { fontFamily: font.bodyBold, fontSize: 17, lineHeight: 25, color: color.paper },
  sub: { fontFamily: font.body, fontSize: 15, color: color.muted },
  doneText: { color: color.faint }, // ไม่ขีดฆ่า: เส้นทับสระบนไทยอ่านยาก
  links: { flexDirection: "row", gap: space.lg },
  miniLink: { minHeight: minTouch, justifyContent: "center" },
  miniText: { fontFamily: font.body, fontSize: 15, color: color.pen, textDecorationLine: "underline" },
  miniOn: { color: color.pen, fontFamily: font.bodyBold, textDecorationLine: "none" },
  act: { minHeight: minTouch, paddingHorizontal: 13, borderWidth: 1.5, borderColor: color.paper, borderRadius: radius.sm, justifyContent: "center", backgroundColor: color.deck, shadowColor: color.rule2, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  actText: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper },
  // ช่องติ๊ก 22px (วาดมือ) แต่พื้นที่กด 44
  tick: { width: 44, height: 44, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  box: {
    width: 22, height: 22, borderWidth: 2, borderColor: color.paper, alignItems: "center", justifyContent: "center",
    borderTopLeftRadius: 2, borderTopRightRadius: 4, borderBottomRightRadius: 3, borderBottomLeftRadius: 2,
  },
  // ตรายาง (จุดเดียวต่อจอ)
  stamp: {
    fontFamily: font.bodyBold, fontSize: 15, color: color.red, borderWidth: 2, borderColor: color.red, borderRadius: 4,
    paddingHorizontal: 9, paddingVertical: 1, transform: [{ rotate: "-6deg" }], opacity: 0.92,
  },

  examRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 2, paddingBottom: 8 },
  exam: { fontFamily: font.body, fontSize: 16, lineHeight: 24, color: color.muted },
  examName: { fontFamily: font.bodyBold, color: color.paper },
  reviewOpen: { flex: 1, minWidth: 0, minHeight: minTouch, justifyContent: "center" },
  star: { color: color.red },
  late: { color: color.warn },
  reviewed: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: minTouch, paddingHorizontal: 4 },
  reviewedText: { fontFamily: font.bodyBold, fontSize: 15, color: color.pen },
  more: { minHeight: minTouch, justifyContent: "center", borderTopWidth: 1, borderTopColor: color.rule },
  moreText: { fontFamily: font.bodyBold, fontSize: 16, color: color.pen, textDecorationLine: "underline" },

  qa: { flexDirection: "row", gap: 10, marginTop: 22 },
  quick: {
    flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: color.deck,
    borderWidth: 1.5, borderColor: color.paper, borderRadius: radius.sm, boxShadow: `2px 2px 0 ${color.paper}`,
  },
  quickDown: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: "none" },
  quickText: { fontFamily: font.bodyMedium, fontSize: 15, color: color.paper },

  sum: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48, marginTop: 18, borderTopWidth: 1, borderColor: color.rule },
  sumText: { fontFamily: font.body, fontSize: 16, color: color.muted },
  sumLink: { fontFamily: font.bodyBold, fontSize: 16, color: color.pen },
});
