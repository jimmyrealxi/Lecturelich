import { useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Btn, Stamp, T, Tape, Tick } from "@/components/ui";
import { AddTaskForm } from "@/components/AddTaskForm";
import { useSession } from "@/lib/auth";
import { useCurrentTerm, useSubjects, useToggleDone, type Assignment } from "@/lib/queries/core";
import { useRooms } from "@/lib/queries/rooms";
import { bangkokNow } from "@/lib/schedule";
import { dueLabel, isDueSoon } from "@/lib/format";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const SOURCE = { classroom: "Classroom", class: "ในคาบ", line: "ไลน์" } as const;

/** แถวงาน 1 ชิ้น: กดช่องสี่เหลี่ยม = ติ๊กส่งแล้ว (optimistic) · กดชื่อ = เปิดลิงก์ (ถ้ามี) · ⋯ = แก้/ลบ */
/** stamp = ตรายาง "เลยกำหนด" (ผู้เรียกส่งให้แถวเลยกำหนดแถวแรกแถวเดียว · จุดเดียวต่อจอ) */
export function TaskRow({ task, subjectName, today, first, stamp }: {
  task: Assignment; subjectName?: string; today: string; first?: boolean; stamp?: boolean;
}) {
  const toggle = useToggleDone();
  const [open, setOpen] = useState(false);
  const temp = task.id.startsWith("temp-");
  const soon = task.due_at && !task.done && isDueSoon(task.due_at);
  const meta = [subjectName, SOURCE[task.source], task.room_id && "ห้องร่วม"].filter(Boolean).join(" · ");
  return (
    <View style={[s.row, !first && s.divider]}>
      <Pressable
        onPress={() => !temp && toggle.mutate({ id: task.id, done: !task.done })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={`ส่งแล้ว: ${task.title}`}
        style={s.hit}
      >
        <View style={[s.check, task.done && s.checked]}>{task.done && <Tick />}</View>
      </Pressable>
      <Pressable style={{ flex: 1 }} disabled={!task.link} onPress={() => task.link && Linking.openURL(task.link)}>
        <Text style={[T.body, task.done && s.doneText]}>{task.title}</Text>
        <Text style={[T.muted, { fontSize: 12 }]}>{meta}</Text>
      </Pressable>
      {task.due_at && (
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {stamp && <Stamp>เลยกำหนด</Stamp>}
          <Text style={[s.due, soon && !task.done && s.dueSoon]}>{dueLabel(task.due_at, today)}</Text>
        </View>
      )}
      <Pressable onPress={() => !temp && setOpen(true)} style={s.hit} accessibilityRole="button"
        accessibilityLabel={`ตัวเลือกงาน ${task.title}`}>
        <Text style={s.dots}>⋯</Text>
      </Pressable>

      {open && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={s.dim} onPress={() => setOpen(false)} accessibilityLabel="ปิด" />
          <View style={s.sheet}>
            <Tape />
            <TaskSheet task={task} meta={meta} onClose={() => setOpen(false)} />
          </View>
        </Modal>
      )}
    </View>
  );
}

/** โหลดสิทธิ์ตอนเปิดเท่านั้น · แก้/ลบได้ = คนสร้าง หรือเจ้าของห้อง (ตรงกับ RLS assignments_update/delete) */
function TaskSheet({ task, meta, onClose }: { task: Assignment; meta: string; onClose: () => void }) {
  const session = useSession();
  const rooms = useRooms();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  if (session === undefined || (task.room_id && rooms.isPending)) return null; // อ่านจากเครื่อง/แคช แป๊บเดียว
  const canEdit = task.created_by === session?.user.id
    || (!!task.room_id && !!rooms.data?.find((r) => r.id === task.room_id)?.isOwner);

  if (canEdit) {
    return <AddTaskForm task={task} subjects={subjects.data ?? []} today={bangkokNow().date} onDone={onClose} />;
  }
  return (
    <View>
      <View style={s.grab} />
      <Text style={T.h3}>{task.title}</Text>
      <Text style={T.muted}>{meta}</Text>
      <Text style={s.lock}>งานนี้เพื่อนเป็นคนเพิ่ม — แก้/ลบได้เฉพาะคนสร้างหรือเจ้าของห้อง · ติ๊กส่งแล้วของเรายังกดได้ตามปกติ</Text>
      <View style={{ flexDirection: "row", marginTop: space.lg }}><Btn label="ปิด" onPress={onClose} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 2 },
  divider: { borderTopWidth: 1, borderTopColor: color.rule },
  hit: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  // ช่องติ๊กวาดมือ · ติ๊กแล้ว = ✓ ปากกาน้ำเงิน
  check: {
    width: 22, height: 22, borderWidth: 2, borderColor: color.paper, alignItems: "center", justifyContent: "center",
    borderTopLeftRadius: 2, borderTopRightRadius: 4, borderBottomRightRadius: 3, borderBottomLeftRadius: 2,
  },
  checked: { borderColor: color.pen },
  doneText: { color: color.faint }, // ไม่ขีดฆ่า: เส้นทับสระบนไทยอ่านยาก
  due: { fontFamily: font.bodyBold, fontSize: 13, color: color.muted },
  dueSoon: { color: color.danger },
  dots: { fontSize: 20, color: color.muted },
  dim: { flex: 1, backgroundColor: "rgba(42,33,24,0.45)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: color.deck,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: color.rule2,
    padding: space.lg, width: "100%", maxWidth: 560, alignSelf: "center",
  },
  grab: { width: 40, height: 4, backgroundColor: color.rule2, borderRadius: 2, alignSelf: "center", marginBottom: space.sm },
  lock: {
    fontFamily: font.body, fontSize: 13, color: color.muted, backgroundColor: color.field, borderWidth: 1, borderColor: color.rule2,
    borderRadius: radius.md, padding: space.md, marginTop: space.md,
  },
});
