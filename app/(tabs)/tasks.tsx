import { useTabTop } from "@/lib/useTabTop";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useFocusEffect } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CrtFocus, Section, Skeleton, T, Tape, UndoBar } from "@/components/ui";
import { CrtStage, useCrtFx } from "@/components/game/CrtFx";
import { TaskRow } from "@/components/TaskRow";
import { AddTaskForm } from "@/components/AddTaskForm";
import { useAssignments, useCurrentTerm, useSubjects, useToggleDone, type Assignment } from "@/lib/queries/core";
import { countdown, dueInfo, shortDate } from "@/lib/format";
import { bangkokParts } from "@/lib/input";
import { urgentTask } from "@/lib/schedule";
import { useNow } from "@/lib/useNow";
import { syncLabel, useClassroomAccount, useSyncClassroom } from "@/lib/queries/classroom";
import { submitXp } from "@/lib/xp";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const WEEK_MS = 7 * 86_400_000;

export default function Tasks() {
  const top = useTabTop();
  const tasks = useAssignments();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [adding, setAdding] = useState(false);
  const today = useNow().date;
  const toggle = useToggleDone();
  const classroom = useClassroomAccount();
  const sync = useSyncClassroom();
  const [toast, setToast] = useState<Assignment | null>(null);
  // งานที่เพิ่งติ๊ก: คงแถวพร้อม ✓ ไว้ก่อน แล้วค่อยหายตอนออกจากหน้าหรือสลับ ยังไม่ส่ง/ส่งแล้ว
  const [ticked, setTicked] = useState<string[]>([]);
  useFocusEffect(useCallback(() => () => setTicked([]), []));

  const names = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s.name])), [subjects.data]);
  const focus = tab === "todo" ? urgentTask(tasks.data ?? [], today) : null;
  const fx = useCrtFx();
  // ส่งแล้วงานหายจากข้อมูลทันที จึงเก็บงานที่กดไว้ให้จอคงอยู่จนภาพจบ
  const [sent, setSent] = useState<Assignment | null>(null);
  const shown = tab === "todo" && fx.play && sent ? sent : focus;
  const send = (a: Assignment) => {
    if (a.id.startsWith("temp-")) return;
    const xp = submitXp(a.due_at, new Date().toISOString());
    const min = (Date.parse(a.due_at!) - Date.now()) / 60_000;
    setSent(a);
    fx.start("submit", xp ? `+${xp} XP` : undefined, min >= 0 && min <= 60);
    toggle.mutate({ id: a.id, done: true });
    setToast(a);
  };
  const undo = () => {
    if (!toast) return;
    toggle.mutate({ id: toast.id, done: false });
    setToast(null);
    fx.stop();
  };
  const groups = useMemo(() => {
    const all = tasks.data ?? [];
    const open = all.filter((a) => !a.done);
    const todo = all.filter((a) => (!a.done || ticked.includes(a.id)) && a.id !== focus?.id); // เรื่องบนจอเขียวไม่ซ้ำในรายการ
    const soonLimit = Date.parse(today + "T00:00:00+07:00") + WEEK_MS; // ภายใน 7 วันนับจากต้นวันนี้
    return {
      todoCount: open.length,
      // ตรายาง "เลยกำหนด" แค่แถวแรกที่เลยกำหนด (แท็บยังไม่ส่ง) · shortcut: เทียบเวลาตอนคำนวณ งานที่เพิ่งเลยกำหนดขณะเปิดหน้าค้างจะขึ้นตอนข้อมูลรีเฟรช
      lateId: tab === "todo" ? todo.find((a) => !a.done && a.due_at && Date.parse(a.due_at) < Date.now())?.id : undefined,
      sections:
        tab === "done"
          ? [{ title: "ส่งแล้ว", items: all.filter((a) => a.done) }]
          : [
              { title: "สัปดาห์นี้", items: todo.filter((a) => a.due_at && Date.parse(a.due_at) < soonLimit) },
              { title: "ถัดไป", items: todo.filter((a) => a.due_at && Date.parse(a.due_at) >= soonLimit) },
              { title: "ไม่มีกำหนดส่ง", items: todo.filter((a) => !a.due_at) },
            ],
    };
  }, [tasks.data, tab, today, focus?.id, ticked]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={top} contentContainerStyle={s.page}>
        <View style={s.seg} accessibilityRole="tablist">
          {(["todo", "done"] as const).map((t) => (
            <Pressable key={t} onPress={() => { setTab(t); setTicked([]); }} style={[s.segItem, tab === t && s.segOn]}
              accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
              <Text style={[s.segText, tab === t && { color: color.deck }]}>
                {t === "todo" ? `ยังไม่ส่ง (${groups.todoCount})` : "ส่งแล้ว"}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "todo" && classroom.data && (
          <View style={s.sync}>
            <Text style={[T.muted, { flex: 1 }]}>
              {classroom.data.last_error === "expired" ? "สิทธิ์ Classroom หมดอายุ ไปเชื่อมใหม่ในตั้งค่า"
                : classroom.data.last_sync_at ? `ดึงจาก Classroom เมื่อ ${syncLabel(classroom.data.last_sync_at, today)}` : "ยังไม่ได้ดึงจาก Classroom"}
            </Text>
            {classroom.data.last_error !== "expired" && (
              <Pressable onPress={() => !sync.isPending && sync.mutate()} style={s.syncBtn} accessibilityRole="button">
                <Text style={s.syncText}>{sync.isPending ? "กำลังดึง" : "ดึงตอนนี้"}</Text>
              </Pressable>
            )}
          </View>
        )}

        {shown && (
          <UrgentCrt task={shown} today={today} subject={shown.subject_id ? names.get(shown.subject_id) : undefined} onSend={() => send(shown)}
            overlay={fx.play && <CrtStage key={fx.play.n} play={fx.play} onEnd={fx.stop} />} />
        )}

        {tasks.isPending ? (
          <Skeleton height={160} />
        ) : groups.sections.every((g) => g.items.length === 0) ? (
          shown ? null :
          <Text style={[T.muted, { textAlign: "center", marginTop: space.xl }]}>
            {tab === "todo" ? "ไม่มีงานค้าง พักได้" : "ยังไม่มีงานที่ส่งแล้ว"}
          </Text>
        ) : (
          groups.sections.filter((g) => g.items.length).map((g) => (
            <View key={g.title}>
              <Section>{g.title}</Section>
              <View style={s.list}>
                {g.items.map((a, i) => (
                  <TaskRow key={a.id} task={a} today={today} first={i === 0} stamp={a.id === groups.lateId}
                    subjectName={a.subject_id ? names.get(a.subject_id) : undefined} onTick={(id) => setTicked((t) => [...t, id])} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable style={s.fab} onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel="เพิ่มงาน">
        <Text style={s.fabText}>+ เพิ่มงาน</Text>
      </Pressable>

      {toast && <UndoBar key={toast.id} text={`ส่ง “${toast.title}” แล้ว`} onUndo={undo} onClose={setToast} />}

      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <Pressable style={s.dim} onPress={() => setAdding(false)} accessibilityLabel="ปิด" />
        <View style={s.sheet}>
          <Tape />
          <AddTaskForm subjects={subjects.data ?? []} today={today} onDone={() => setAdding(false)} />
        </View>
      </Modal>
    </View>
  );
}

/** จอเขียวแท็บงาน (docs/mockups/a-crt-focus.html): งานเลยกำหนดนานสุด หรือใกล้ส่งสุด + ปุ่มส่งแล้ว */
function UrgentCrt({ task, today, subject, onSend, overlay }: { task: Assignment; today: string; subject?: string; onSend: () => void; overlay: ReactNode }) {
  const min = Math.ceil((Date.parse(task.due_at!) - Date.now()) / 60_000);
  const late = min < 0;
  const left = countdown(Math.abs(min));
  const due = dueInfo(task.due_at!, today);
  const day = due.days === -1 ? "เมื่อวาน" : due.days < 0 ? shortDate(bangkokParts(task.due_at!).date) : due.day;
  return (
    <CrtFocus label={late ? "เลยกำหนด" : "ใกล้ส่งสุด"} title={task.title} detail={`${subject ?? "ไม่ผูกวิชา"} · ${day} ${due.time}`} big={left.n} unit={left.unit} overlay={overlay}>
      <Pressable onPress={onSend} accessibilityRole="button" accessibilityLabel={`ส่งแล้ว: ${task.title}`}
        style={({ pressed }) => [s.crtBtn, pressed && { transform: [{ scale: 0.97 }] }]}>
        <Text style={s.crtBtnText}>ส่งแล้ว</Text>
      </Pressable>
    </CrtFocus>
  );
}

const s = StyleSheet.create({
  crtBtn: { minHeight: minTouch, marginTop: 12, borderWidth: 1, borderColor: "#2F6B42", borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  crtBtnText: { fontFamily: font.bodyBold, fontSize: 15, color: color.crtOn },
  page: { padding: space.lg, paddingBottom: 96, width: "100%", maxWidth: 560, alignSelf: "center" },
  // แท็บสลับ: ที่เลือก = หมึกเต็ม
  seg: { flexDirection: "row", borderWidth: 1.5, borderColor: color.paper, borderRadius: radius.md, overflow: "hidden" },
  segItem: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: color.paper },
  segText: { fontFamily: font.bodyBold, fontSize: 15, color: color.paper },
  sync: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: minTouch, marginTop: space.sm },
  syncBtn: { minHeight: minTouch, minWidth: 72, alignItems: "flex-end", justifyContent: "center" },
  syncText: { fontFamily: font.bodyBold, fontSize: 15, color: color.pen, textDecorationLine: "underline" },
  list: { borderBottomWidth: 1, borderBottomColor: color.rule },
  // FAB หมึกเต็ม + เงาแข็ง
  fab: {
    position: "absolute", right: space.lg, bottom: space.lg, minHeight: 52, paddingHorizontal: space.lg,
    borderRadius: radius.md, backgroundColor: color.paper, justifyContent: "center", boxShadow: `3px 3px 0 ${color.rule2}`,
  },
  fabText: { fontFamily: font.bodyBold, fontSize: 15, color: color.deck },
  dim: { flex: 1, backgroundColor: "rgba(42,33,24,0.45)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: color.deck,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: color.rule2,
    padding: space.lg, width: "100%", maxWidth: 560, alignSelf: "center",
  },
});
