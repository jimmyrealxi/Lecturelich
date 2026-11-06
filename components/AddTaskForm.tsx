import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Btn, Field, T } from "@/components/ui";
import { useAddAssignment, type Assignment } from "@/lib/queries/core";
import { useRooms } from "@/lib/queries/rooms";
import { bangkokIso, isDate, normTime, normUrl } from "@/lib/input";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const SOURCES: { value: Assignment["source"]; label: string }[] = [
  { value: "classroom", label: "Classroom" },
  { value: "class", label: "ในคาบ" },
  { value: "line", label: "ไลน์" },
];

/** ฟอร์มเพิ่มงาน (ใช้ในแผ่นล่างของแท็บงาน และหน้าจดหลังคาบ) */
export function AddTaskForm({ subjects, today, onDone, defaultSubjectId, defaultSource = "classroom" }: {
  subjects: { id: string; name: string }[];
  today: string;
  onDone: () => void;
  defaultSubjectId?: string;
  defaultSource?: Assignment["source"];
}) {
  const add = useAddAssignment();
  const rooms = useRooms().data ?? [];
  const [roomId, setRoomId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(defaultSubjectId ?? null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("23:59");
  const [source, setSource] = useState<Assignment["source"]>(defaultSource);
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
      title: title.trim(), subject_id: subjectId, source, link: url ?? null, room_id: roomId,
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

      {rooms.length > 0 && (
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
        <Btn label="ยกเลิก" onPress={onDone} style={{ flex: 0.5 }} />
        <Btn kind="primary" label="เพิ่มงาน" onPress={onSave} />
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
