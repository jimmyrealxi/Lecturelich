import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Btn, Field, T } from "@/components/ui";
import { useAddAssignment, useDeleteAssignment, useUpdateAssignment, type Assignment } from "@/lib/queries/core";
import { useRooms } from "@/lib/queries/rooms";
import { bangkokIso, bangkokParts, isDate, normTime, normUrl } from "@/lib/input";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const SOURCES: { value: Assignment["source"]; label: string }[] = [
  { value: "classroom", label: "Classroom" },
  { value: "class", label: "ในคาบ" },
  { value: "line", label: "ไลน์" },
];

/** ฟอร์มเพิ่มงาน (แผ่นล่างของแท็บงาน / หน้าจดหลังคาบ) · ส่ง task มา = โหมดแก้ไข + ปุ่มลบ */
export function AddTaskForm({ subjects, today, onDone, defaultSubjectId, defaultSource = "classroom", task }: {
  subjects: { id: string; name: string }[];
  today: string;
  onDone: () => void;
  defaultSubjectId?: string;
  defaultSource?: Assignment["source"];
  task?: Assignment;
}) {
  const add = useAddAssignment();
  const rooms = useRooms().data ?? [];
  const update = useUpdateAssignment();
  const del = useDeleteAssignment();
  const initDue = task?.due_at ? bangkokParts(task.due_at) : null;
  const [confirming, setConfirming] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [title, setTitle] = useState(task?.title ?? "");
  const [subjectId, setSubjectId] = useState<string | null>(task ? task.subject_id : (defaultSubjectId ?? null));
  const [date, setDate] = useState(initDue?.date ?? "");
  const [time, setTime] = useState(initDue?.time ?? "23:59");
  const [source, setSource] = useState<Assignment["source"]>(task?.source ?? defaultSource);
  const [link, setLink] = useState(task?.link ?? "");
  const [tried, setTried] = useState(false);

  const errTitle = !title.trim() ? "ใส่ชื่องาน" : null;
  const errDate = date && !isDate(date) ? "รูปแบบ ปปปป-ดด-วว" : date && date < today && date !== initDue?.date ? "วันนี้หรือหลังจากนี้" : null;
  const errTime = date && !normTime(time) ? "เช่น 23:59" : null;
  const url = normUrl(link);

  const onSave = () => {
    setTried(true);
    if (errTitle || errDate || errTime || url === undefined) return;
    const fields = {
      title: title.trim(), source, link: url ?? null,
      due_at: date ? bangkokIso(date, normTime(time)!) : null,
    };
    if (task) {
      // ส่ง subject_id เฉพาะตอนเปลี่ยน: ค่าที่เห็นเป็นวิชา "ของเรา" (งานห้องอาจผูกวิชาเพื่อน) อย่าเขียนทับ
      update.mutate({ id: task.id, patch: subjectId !== task.subject_id ? { ...fields, subject_id: subjectId } : fields });
    } else {
      add.mutate({ ...fields, subject_id: subjectId, room_id: roomId });
    }
    onDone(); // optimistic: รายการเปลี่ยนทันที ถ้าล้มเหลวจะย้อนเอง
  };

  if (task && confirming) {
    return (
      <View>
        <View style={s.grab} />
        <Text style={T.h3}>ลบ &quot;{task.title}&quot;?</Text>
        <Text style={T.muted}>
          {task.room_id ? "งานนี้อยู่ในห้องร่วม — จะหายจากทุกคนในห้อง ย้อนกลับไม่ได้" : "ย้อนกลับไม่ได้"}
        </Text>
        <View style={[s.two, { marginTop: space.lg }]}>
          <Btn label="ยกเลิก" onPress={() => setConfirming(false)} />
          <Btn kind="dangerFill" label="ลบเลย" onPress={() => { del.mutate(task.id); onDone(); }} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={s.grab} />
      <Text style={T.h3}>{task ? "แก้ไขงาน" : "เพิ่มงาน"}</Text>
      <Field label="ชื่องาน" value={title} onChangeText={setTitle} placeholder="Lab 6 Interface" maxLength={120}
        error={tried ? errTitle : null} autoFocus={!task} />

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

      {!task && rooms.length > 0 && (
        <>
          <Text style={s.label}>แชร์ไปที่ (เพื่อนในห้องเห็นงานนี้ · สถานะส่งยังเป็นของแต่ละคน)</Text>
          <View style={s.chips}>
            {[{ id: null, name: "ส่วนตัว" }, ...rooms].map((r) => (
              <Pressable key={r.id ?? "me"} onPress={() => setRoomId(r.id)} style={[s.chip, roomId === r.id && s.chipOn]}
                accessibilityRole="radio" accessibilityState={{ selected: roomId === r.id }}>
                <Text style={[s.chipText, roomId === r.id && { color: color.white }]}>{r.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

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
        {task
          ? <Btn kind="danger" label="ลบ" onPress={() => setConfirming(true)} style={{ flex: 0.6 }} />
          : <Btn label="ยกเลิก" onPress={onDone} style={{ flex: 0.5 }} />}
        <Btn kind="primary" label={task ? "บันทึก" : "เพิ่มงาน"} onPress={onSave} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
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
