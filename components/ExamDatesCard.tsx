import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Btn, Card, Field, T } from "@/components/ui";
import { useSaveExams } from "@/lib/queries/review";
import { daysUntil, type ExamRow } from "@/lib/review";
import { isDate } from "@/lib/input";
import { color, font, space } from "@/lib/theme";

// วันสอบกลาง/ปลายภาคของวิชา (= บอสในหน้าเกม) · ใช้ key={วันที่เดิม} จากผู้เรียกเพื่อรีเซ็ตค่าเริ่มต้น

export function ExamDatesCard({ subjectId, termId, exams, today }: {
  subjectId: string; termId: string; exams: ExamRow[]; today: string;
}) {
  const save = useSaveExams(termId);
  const init = (k: ExamRow["kind"]) => exams.find((e) => e.kind === k)?.date ?? "";
  const [mid, setMid] = useState(init("midterm"));
  const [fin, setFin] = useState(init("final"));
  const [tried, setTried] = useState(false);
  const err = (v: string) => (v.trim() && !isDate(v.trim()) ? "รูปแบบ ปปปป-ดด-วว" : null);
  const errOrder = !err(mid) && !err(fin) && mid.trim() && fin.trim() && fin.trim() < mid.trim() ? "ปลายภาคต้องหลังกลางภาค" : null;
  const dday = (v: string, label: string) => (isDate(v.trim()) && v.trim() >= today ? `${label} D-${daysUntil(v.trim(), today)}` : null);
  const info = [dday(mid, "กลางภาค"), dday(fin, "ปลายภาค")].filter(Boolean).join(" · ");

  const onSave = () => {
    setTried(true);
    if (err(mid) || err(fin) || errOrder) return;
    save.mutate({ subjectId, dates: { midterm: mid.trim() || null, final: fin.trim() || null } });
  };

  return (
    <Card>
      <View style={s.row}>
        <Field label="กลางภาค" value={mid} onChangeText={setMid} placeholder="ปปปป-ดด-วว" maxLength={10} error={tried ? err(mid) : null} />
        <Field label="ปลายภาค" value={fin} onChangeText={setFin} placeholder="ปปปป-ดด-วว" maxLength={10} error={tried ? err(fin) : null} />
      </View>
      <Text style={[T.muted, { marginTop: space.sm }]}>เว้นว่าง = ยังไม่มีบอส{info ? ` · ${info}` : ""}</Text>
      {tried && errOrder && <Text style={s.err}>{errOrder}</Text>}
      {save.isError && <Text style={s.err}>บันทึกไม่สำเร็จ ลองอีกครั้ง</Text>}
      <View style={[s.row, { marginTop: space.md }]}>
        <Btn kind="primary" label={save.isPending ? "กำลังบันทึก…" : save.isSuccess ? "บันทึกแล้ว ✓" : "บันทึกวันสอบ"} onPress={onSave} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  err: { fontFamily: font.body, fontSize: 13, color: color.danger, marginTop: space.sm },
});
