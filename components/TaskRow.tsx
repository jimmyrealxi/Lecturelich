import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { T } from "@/components/ui";
import { useToggleDone, type Assignment } from "@/lib/queries/core";
import { dueLabel, isDueSoon } from "@/lib/format";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const SOURCE = { classroom: "Classroom", class: "ในคาบ", line: "ไลน์" } as const;

/** แถวงาน 1 ชิ้น: กดช่องสี่เหลี่ยม = ติ๊กส่งแล้ว (optimistic) · กดชื่อ = เปิดลิงก์ (ถ้ามี) */
export function TaskRow({ task, subjectName, today, first }: {
  task: Assignment; subjectName?: string; today: string; first?: boolean;
}) {
  const toggle = useToggleDone();
  const soon = task.due_at && !task.done && isDueSoon(task.due_at);
  return (
    <View style={[s.row, !first && s.divider]}>
      <Pressable
        onPress={() => !task.id.startsWith("temp-") && toggle.mutate({ id: task.id, done: !task.done })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={`ส่งแล้ว: ${task.title}`}
        style={s.hit}
      >
        <View style={[s.check, task.done && s.checked]}>{task.done && <Text style={s.tick}>✓</Text>}</View>
      </Pressable>
      <Pressable style={{ flex: 1 }} disabled={!task.link} onPress={() => task.link && Linking.openURL(task.link)}>
        <Text style={[T.body, task.done && s.doneText]}>{task.title}</Text>
        <Text style={[T.muted, { fontSize: 12 }]}>{[subjectName, SOURCE[task.source], task.room_id && "ห้องร่วม"].filter(Boolean).join(" · ")}</Text>
      </Pressable>
      {task.due_at && (
        <Text style={[s.due, soon && s.dueSoon]}>{dueLabel(task.due_at, today)}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 2 },
  divider: { borderTopWidth: 1, borderTopColor: color.line },
  hit: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  check: { width: 26, height: 26, borderWidth: 2, borderColor: color.blue, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  checked: { backgroundColor: color.blue },
  tick: { color: color.white, fontSize: 16, lineHeight: 18 },
  doneText: { color: color.sub, textDecorationLine: "line-through" },
  due: {
    fontFamily: font.bodyBold, fontSize: 12, color: color.sub, backgroundColor: color.cream,
    paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.sm, overflow: "hidden",
  },
  dueSoon: { color: color.danger, backgroundColor: color.dangerBg },
});
