import { useTabTop } from "@/lib/useTabTop";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Btn, Card, DateField, Field, Section, Skeleton, T } from "@/components/ui";
import { useCurrentTerm, type CurrentTerm } from "@/lib/queries/core";
import { useProfile, useSaveTerm, useUpdateProfile } from "@/lib/queries/setup";
import { PushCard } from "@/components/PushCard";
import { RoomsCard } from "@/components/RoomsCard";
import { signOut, useSession } from "@/lib/auth";
import { DATE_ERR, fromThaiDate, toThaiDate } from "@/lib/input";
import { thaiDate } from "@/lib/format";
import { color, font, space } from "@/lib/theme";

const weeks = (a: string, b: string) => Math.ceil((Date.parse(b) - Date.parse(a) + 86_400_000) / (7 * 86_400_000));

export default function Settings() {
  const top = useTabTop();
  const session = useSession();
  const term = useCurrentTerm();
  const profile = useProfile();
  const update = useUpdateProfile();
  const [creating, setCreating] = useState(false);

  const pct = profile.data?.min_attendance_pct ?? 80;
  const afterMin = profile.data?.remind_after_class_min ?? 10;
  const dueHours = profile.data?.remind_due_hours ?? 24;
  // ฟอร์มสร้างใหม่ตาม key → ค่าเริ่มต้นเปลี่ยนตามเทอมที่แก้ โดยไม่ต้อง setState ใน effect
  const formTerm = creating ? null : term.data ?? null;

  return (
    <ScrollView ref={top} contentContainerStyle={s.page}>
      <Section>เทอมปัจจุบัน</Section>
      {term.isPending ? (
        <Skeleton />
      ) : term.data ? (
        <Card>
          <View style={s.between}>
            <Text style={T.h3}>{term.data.name}</Text>
            <Btn label={creating ? "แก้เทอมนี้" : "เทอมใหม่"} onPress={() => setCreating(!creating)} style={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto" }} />
          </View>
          <Text style={T.muted}>
            {thaiDate(term.data.start_date)} – {thaiDate(term.data.end_date)} · {weeks(term.data.start_date, term.data.end_date)} สัปดาห์
          </Text>
        </Card>
      ) : (
        <Text style={[T.muted, { marginBottom: space.sm }]}>ยังไม่มีเทอม เริ่มจากเพิ่มเทอมด้านล่าง</Text>
      )}

      {!term.isPending && (
        <TermForm key={formTerm?.id ?? "new"} term={formTerm} onSaved={() => setCreating(false)} />
      )}

      <Section>แจ้งเตือนบนเครื่องนี้</Section>
      <PushCard />
      <Card>
        <Stepper label="เตือนจดหลังเลิกคาบ" value={`${afterMin} นาที`}
          onMinus={() => update.mutate({ remind_after_class_min: Math.max(0, afterMin - 5) })}
          onPlus={() => update.mutate({ remind_after_class_min: Math.min(180, afterMin + 5) })} />
        <Stepper label="เตือนก่อนส่งงาน" value={`${dueHours} ชม.`}
          onMinus={() => update.mutate({ remind_due_hours: Math.max(1, dueHours - (dueHours > 24 ? 24 : 6)) })}
          onPlus={() => update.mutate({ remind_due_hours: Math.min(168, dueHours + (dueHours >= 24 ? 24 : 6)) })} />
      </Card>

      <Section>การเข้าเรียน</Section>
      <Card>
        <Stepper label="เกณฑ์ต้องเข้าเรียน" value={`${pct}%`}
          onMinus={() => update.mutate({ min_attendance_pct: Math.max(50, pct - 5) })}
          onPlus={() => update.mutate({ min_attendance_pct: Math.min(100, pct + 5) })} />
      </Card>

      <Section>ห้องร่วม (แชร์งานกับเพื่อน)</Section>
      <RoomsCard />

      <Section>บัญชี</Section>
      <Card>
        <View style={s.between}>
          <Text style={[T.body, { flex: 1 }]} numberOfLines={1}>{session?.user.email ?? ""}</Text>
          <Btn label="ออกจากระบบ" onPress={() => signOut()} style={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto" }} />
        </View>
      </Card>
    </ScrollView>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={[s.between, { paddingVertical: 4 }]}>
      <Text style={[T.body, { flex: 1 }]}>{label}</Text>
      <Btn label="−" onPress={onMinus} style={s.step} />
      <Text style={s.pct} accessibilityLiveRegion="polite">{value}</Text>
      <Btn label="+" onPress={onPlus} style={s.step} />
    </View>
  );
}

function TermForm({ term, onSaved }: { term: CurrentTerm | null; onSaved: () => void }) {
  const saveTerm = useSaveTerm();
  const [name, setName] = useState(term?.name ?? "");
  const [start, setStart] = useState(term ? toThaiDate(term.start_date) : "");
  const [end, setEnd] = useState(term ? toThaiDate(term.end_date) : "");
  const [tried, setTried] = useState(false);

  const startIso = fromThaiDate(start);
  const endIso = fromThaiDate(end);
  const errName = !name.trim() ? "ใส่ชื่อเทอม" : null;
  const errStart = !startIso ? DATE_ERR : null;
  const errEnd = !endIso ? DATE_ERR : startIso && endIso < startIso ? "ต้องไม่ก่อนวันเปิดเทอม" : null;

  const onSave = () => {
    setTried(true);
    if (errName || errStart || errEnd) return;
    saveTerm.mutate({ id: term?.id, name: name.trim(), start_date: startIso!, end_date: endIso! }, { onSuccess: onSaved });
  };

  return (
    <Card>
      <Text style={T.h3}>{term ? "แก้เทอม" : "เพิ่มเทอม"}</Text>
      <Field label="ชื่อเทอม" value={name} onChangeText={setName} placeholder="เทอม 2/2569" maxLength={60}
        error={tried ? errName : null} />
      <View style={s.two}>
        <DateField label="วันเปิดเทอม" value={start} onChangeText={setStart} placeholder="09/11/2569" error={tried ? errStart : null} />
        <DateField label="วันปิดเทอม" value={end} onChangeText={setEnd} placeholder="07/03/2570" error={tried ? errEnd : null} />
      </View>
      {saveTerm.error && <Text style={s.error}>บันทึกไม่สำเร็จ: {saveTerm.error.message}</Text>}
      <View style={s.row}>
        <Btn kind="primary" label={saveTerm.isPending ? "กำลังบันทึก…" : "บันทึกเป็นเทอมปัจจุบัน"} onPress={onSave} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  page: { padding: space.md, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  two: { flexDirection: "row", gap: space.sm },
  row: { flexDirection: "row", marginTop: space.md },
  step: { flex: 0, width: 44 },
  pct: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper, minWidth: 64, textAlign: "center" },
  error: { fontFamily: font.body, fontSize: 14, color: color.danger, marginTop: space.sm },
});
