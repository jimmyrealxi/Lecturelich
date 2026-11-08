import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AddBtn, Btn, Card, confirmAction, DateField, Field, Section, T, Tape, TimeField } from "@/components/ui";
import type { CurrentTerm } from "@/lib/queries/core";
import { useAddMakeup, useDeleteMakeup } from "@/lib/queries/setup";
import { hhmm, shortDate, typedDate } from "@/lib/format";
import { DATE_ERR, fromThaiDate, normTime } from "@/lib/input";
import { inTerm, type Slot } from "@/lib/schedule";
import { color, font, minTouch, radius, space } from "@/lib/theme";

// คาบชดเชยบนหน้าวิชา (docs/mockups/a-makeup-class.html) · ใช้ตารางคาบเดิม จึงเช็กชื่อ/จด/เตือนได้เหมือนคาบปกติ

export function MakeupClasses({ subjectId, term, slots }: { subjectId: string; term: CurrentTerm; slots: Slot[] }) {
  const del = useDeleteMakeup(term.id);
  const [adding, setAdding] = useState(false);
  const rows = slots
    .filter((x) => x.makeup_date)
    .sort((a, b) => `${a.makeup_date}${a.start_time}`.localeCompare(`${b.makeup_date}${b.start_time}`));
  const remove = (x: Slot) =>
    confirmAction("ลบคาบชดเชย? การเช็กชื่อของคาบนี้จะหาย โน้ตยังอยู่", () => del.mutate(x.id));

  return (
    <>
      <Section>คาบชดเชย</Section>
      <Card style={{ marginBottom: 0 }}>
        {rows.length === 0 && <Text style={T.muted}>ยังไม่มีคาบชดเชย</Text>}
        {rows.map((x, i) => (
          <View key={x.id} style={[s.row, i > 0 && s.line]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.when}>{shortDate(x.makeup_date!)} <Text style={s.time}>{hhmm(x.start_time)}–{hhmm(x.end_time)}</Text></Text>
              {!!x.room && <Text style={T.muted}>{x.room}</Text>}
            </View>
            <Pressable style={s.del} onPress={() => remove(x)} accessibilityRole="button" accessibilityLabel={`ลบคาบชดเชย ${shortDate(x.makeup_date!)}`}>
              <Text style={s.delText}>ลบ</Text>
            </Pressable>
          </View>
        ))}
        {del.isError && <Text style={s.err}>ลบไม่สำเร็จ ลองอีกครั้ง</Text>}
      </Card>
      <AddBtn label="+ เพิ่มคาบชดเชย" onPress={() => setAdding(true)} />

      {adding && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setAdding(false)}>
          <Pressable style={s.dim} onPress={() => setAdding(false)} accessibilityLabel="ปิด" />
          <View style={s.sheet}>
            <Tape />
            <MakeupForm subjectId={subjectId} term={term} defaultRoom={slots.find((x) => !x.makeup_date)?.room ?? ""} onDone={() => setAdding(false)} />
          </View>
        </Modal>
      )}
    </>
  );
}

function MakeupForm({ subjectId, term, defaultRoom, onDone }: { subjectId: string; term: CurrentTerm; defaultRoom: string; onDone: () => void }) {
  const add = useAddMakeup(term.id);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [room, setRoom] = useState(defaultRoom);
  const [tried, setTried] = useState(false);

  const d = fromThaiDate(date);
  const a = normTime(start);
  const b = normTime(end);
  const errDate = !d ? DATE_ERR
    : !inTerm(d, term) ? `วันที่ต้องอยู่ในเทอมนี้ (${typedDate(term.start_date)} – ${typedDate(term.end_date)})` : null;
  const errStart = !a ? "เช่น 13:00" : null;
  const errEnd = !b ? "เช่น 15:00" : a && b <= a ? "เวลาจบต้องหลังเวลาเริ่ม" : null;

  const onSave = () => {
    setTried(true);
    if (errDate || errStart || errEnd || add.isPending) return;
    add.mutate({ subject_id: subjectId, makeup_date: d!, start_time: a!, end_time: b!, room: room.trim() || null }, { onSuccess: onDone });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text style={s.title} accessibilityRole="header">เพิ่มคาบชดเชย</Text>
      <DateField label="วันที่" value={date} onChangeText={setDate} error={tried ? errDate : null} />
      <View style={s.two}>
        <TimeField label="เริ่ม" value={start} onChangeText={setStart} placeholder="13:00" error={tried ? errStart : null} />
        <TimeField label="จบ" value={end} onChangeText={setEnd} placeholder="15:00" error={tried ? errEnd : null} />
      </View>
      <Field label="ห้อง" value={room} onChangeText={setRoom} placeholder="SC9-604" maxLength={40} />
      {add.isError && <Text style={s.err}>บันทึกไม่สำเร็จ ลองอีกครั้ง</Text>}
      <View style={[s.two, { marginTop: space.lg }]}>
        <Btn kind="primary" label={add.isPending ? "กำลังบันทึก…" : "บันทึก"} onPress={onSave} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56 },
  line: { borderTopWidth: 1, borderTopColor: color.rule },
  when: { fontFamily: font.bodyBold, fontSize: 15, color: color.paper },
  time: { fontFamily: font.typeBold }, // Courier Prime ไม่มีตัวไทย → ใช้เฉพาะตัวเลขเวลา
  del: { minHeight: minTouch, minWidth: minTouch, alignItems: "center", justifyContent: "center" },
  delText: { fontFamily: font.bodyBold, fontSize: 14, color: color.danger },
  err: { fontFamily: font.body, fontSize: 13, color: color.danger, marginTop: space.sm },
  title: { fontFamily: font.title, fontSize: 19, lineHeight: 28, color: color.paper },
  two: { flexDirection: "row", gap: space.sm },
  dim: { flex: 1, backgroundColor: "rgba(42,33,24,0.45)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: color.deck,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: color.rule2,
    padding: space.lg, width: "100%", maxWidth: 560, alignSelf: "center",
  },
});
