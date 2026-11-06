import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Btn, Card, Field, Section, Skeleton, T } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { useAddAssignment, useAssignments, useCurrentTerm, useSubjects, type Assignment } from "@/lib/queries/core";
import { bangkokNow } from "@/lib/schedule";
import { bangkokIso, isDate, normTime, normUrl } from "@/lib/input";
import { color, font, minTouch, radius, space } from "@/lib/theme";

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
              <Text style={[s.segText, tab === t && { color: color.white, fontFamily: font.bodyBold }]}>
                {t === "todo" ? `ยังไม่ส่ง (${groups.todoCount})` : "ส่งแล้ว"}
              </Text>
            </Pressable>
          ))}
        </View>

        {tasks.isPending ? (
          <Skeleton height={160} />
        ) : groups.sections.every((g) => g.items.length === 0) ? (
          <Text style={[T.muted, { textAlign: "center", marginTop: space.xl }]}>
            {tab === "todo" ? "ไม่มีงานค้าง 🎉" : "ยังไม่มีงานที่ส่งแล้ว"}
          </Text>
        ) : (
          groups.sections.filter((g) => g.items.length).map((g) => (
            <View key={g.title}>
              <Section>{g.title}</Section>
              <Card>
                {g.items.map((a, i) => (
                  <TaskRow key={a.id} task={a} today={today} first={i === 0}
                    subjectName={a.subject_id ? names.get(a.subject_id) : undefined} />
                ))}
              </Card>
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
          <AddTaskForm subjects={subjects.data ?? []} today={today} onDone={() => setAdding(false)} />
        </View>
      </Modal>
    </View>
  );
}

const SOURCES: { value: Assignment["source"]; label: string }[] = [
  { value: "classroom", label: "Classroom" },
  { value: "class", label: "ในคาบ" },
  { value: "line", label: "ไลน์" },
];

/** แผ่นเพิ่มงาน — ใช้ซ้ำได้ในหน้าจดหลังคาบ (ขั้น 2) */
export function AddTaskForm({ subjects, today, onDone, defaultSubjectId }: {
  subjects: { id: string; name: string }[]; today: string; onDone: () => void; defaultSubjectId?: string;
}) {
  const add = useAddAssignment();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(defaultSubjectId ?? null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("23:59");
  const [source, setSource] = useState<Assignment["source"]>("classroom");
  const [link, setLink] = useState("");
  const [tried, setTried] = useState(false);

  const errTitle = !title.trim() ? "ใส่ชื่องาน" : null;
  const errDate = date && !isDate(date) ? "รูปแบบ ปปปป-ดด-วว" : date && date < today ? "วันนี้หรือหลังจากนี้" : null;
  const errTime = date && !normTime(time) ? "เช่น 23:59" : null;
  const url = normUrl(link);

  const onSave = () => {
    setTried(true);
    if (errTitle || errDate || errTime || url === undefined) return;
    add.mutate({
      title: title.trim(), subject_id: subjectId, source, link: url ?? null,
      due_at: date ? bangkokIso(date, normTime(time)!) : null,
    });
    onDone(); // optimistic: งานโผล่ในรายการทันที ถ้าล้มเหลวจะหายเอง
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={s.grab} />
      <Text style={T.h3}>เพิ่มงาน</Text>
      <Field label="ชื่องาน" value={title} onChangeText={setTitle} placeholder="Lab 6 Interface" maxLength={120}
        error={tried ? errTitle : null} autoFocus />

      <Text style={s.label}>วิชา</Text>
      <View style={s.chips}>
        {subjects.map((sub) => (
          <Pressable key={sub.id} onPress={() => setSubjectId(subjectId === sub.id ? null : sub.id)}
            style={[s.chip, subjectId === sub.id && s.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: subjectId === sub.id }}>
            <Text style={[s.chipText, subjectId === sub.id && { color: color.white }]}>{sub.name}</Text>
          </Pressable>
        ))}
        {subjects.length === 0 && <Text style={T.muted}>ยังไม่มีวิชา (เพิ่มได้ในแท็บวิชา)</Text>}
      </View>

      <View style={s.two}>
        <Field label="กำหนดส่ง (ไม่ใส่ก็ได้)" value={date} onChangeText={setDate} placeholder={today} error={tried ? errDate : null} />
        <Field label="เวลา" value={time} onChangeText={setTime} placeholder="23:59" maxLength={5} error={tried ? errTime : null}
          style={{ flex: 0.6 }} />
      </View>

      <Text style={s.label}>มาจาก</Text>
      <View style={s.two}>
        {SOURCES.map((o) => <Btn key={o.value} label={o.label} selected={source === o.value} onPress={() => setSource(o.value)} />)}
      </View>

      <Field label="ลิงก์ (ไม่ใส่ก็ได้)" value={link} onChangeText={setLink} placeholder="https://" autoCapitalize="none"
        keyboardType="url" error={tried && url === undefined ? "ลิงก์ไม่ถูกต้อง" : null} />

      <View style={[s.two, { marginTop: space.lg }]}>
        <Btn label="ยกเลิก" onPress={onDone} style={{ flex: 0.5 }} />
        <Btn kind="primary" label="เพิ่มงาน" onPress={onSave} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: space.md, paddingBottom: 96, width: "100%", maxWidth: 560, alignSelf: "center" },
  seg: { flexDirection: "row", backgroundColor: color.white, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: color.blue },
  segText: { fontFamily: font.body, fontSize: 14, color: color.sub },
  fab: {
    position: "absolute", right: space.lg, bottom: space.lg, minHeight: 52, paddingHorizontal: space.lg,
    borderRadius: radius.pill, backgroundColor: color.blue, justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  fabText: { fontFamily: font.bodyBold, fontSize: 15, color: color.white },
  dim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: color.white,
    borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: space.lg, width: "100%", maxWidth: 560, alignSelf: "center",
  },
  grab: { width: 40, height: 4, backgroundColor: color.line, borderRadius: 2, alignSelf: "center", marginBottom: space.sm },
  label: { fontFamily: font.body, fontSize: 13, color: color.sub, marginTop: space.md, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    minHeight: minTouch, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line,
    justifyContent: "center", backgroundColor: color.white,
  },
  chipOn: { backgroundColor: color.blue, borderColor: color.blue },
  chipText: { fontFamily: font.body, fontSize: 14, color: color.ink },
  two: { flexDirection: "row", gap: space.sm },
});
