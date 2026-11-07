import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Section, Skeleton, T, Tape } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { AddTaskForm } from "@/components/AddTaskForm";
import { useAssignments, useCurrentTerm, useSubjects } from "@/lib/queries/core";
import { bangkokNow } from "@/lib/schedule";
import { color, font, radius, space } from "@/lib/theme";

const WEEK_MS = 7 * 86_400_000;

export default function Tasks() {
  const tasks = useAssignments();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [adding, setAdding] = useState(false);
  const today = bangkokNow().date;

  const names = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s.name])), [subjects.data]);
  const groups = useMemo(() => {
    const all = tasks.data ?? [];
    const todo = all.filter((a) => !a.done);
    const soonLimit = Date.parse(today + "T00:00:00+07:00") + WEEK_MS; // ภายใน 7 วันนับจากต้นวันนี้
    return {
      todoCount: todo.length,
      // ตรายาง "เลยกำหนด" แค่แถวแรกที่เลยกำหนด (แท็บยังไม่ส่ง) · shortcut: เทียบเวลาตอนคำนวณ งานที่เพิ่งเลยกำหนดขณะเปิดหน้าค้างจะขึ้นตอนข้อมูลรีเฟรช
      lateId: tab === "todo" ? todo.find((a) => a.due_at && Date.parse(a.due_at) < Date.now())?.id : undefined,
      sections:
        tab === "done"
          ? [{ title: "ส่งแล้ว", items: all.filter((a) => a.done) }]
          : [
              { title: "สัปดาห์นี้", items: todo.filter((a) => a.due_at && Date.parse(a.due_at) < soonLimit) },
              { title: "ถัดไป", items: todo.filter((a) => a.due_at && Date.parse(a.due_at) >= soonLimit) },
              { title: "ไม่มีกำหนดส่ง", items: todo.filter((a) => !a.due_at) },
            ],
    };
  }, [tasks.data, tab, today]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.seg} accessibilityRole="tablist">
          {(["todo", "done"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.segItem, tab === t && s.segOn]}
              accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
              <Text style={[s.segText, tab === t && { color: color.deck }]}>
                {t === "todo" ? `ยังไม่ส่ง (${groups.todoCount})` : "ส่งแล้ว"}
              </Text>
            </Pressable>
          ))}
        </View>

        {tasks.isPending ? (
          <Skeleton height={160} />
        ) : groups.sections.every((g) => g.items.length === 0) ? (
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
                    subjectName={a.subject_id ? names.get(a.subject_id) : undefined} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable style={s.fab} onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel="เพิ่มงาน">
        <Text style={s.fabText}>+ เพิ่มงาน</Text>
      </Pressable>

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

const s = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: 96, width: "100%", maxWidth: 560, alignSelf: "center" },
  // แท็บสลับ: ที่เลือก = หมึกเต็ม
  seg: { flexDirection: "row", borderWidth: 1.5, borderColor: color.paper, borderRadius: radius.md, overflow: "hidden" },
  segItem: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: color.paper },
  segText: { fontFamily: font.bodyBold, fontSize: 14, color: color.paper },
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
