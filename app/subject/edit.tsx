import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Btn, Field, Skeleton, confirmAction } from "@/components/ui";
import { useCurrentTerm, useSlots, useSubjects, type Subject } from "@/lib/queries/core";
import type { Slot } from "@/lib/schedule";
import { useDeleteSubject, useSaveSubject, type SlotInput } from "@/lib/queries/setup";
import { normTime, normUrl } from "@/lib/input";
import { hhmm } from "@/lib/format";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const COLORS = ["#1F4E9C", "#7A5AA6", "#1E7A46", "#B0562A", "#A23B5E", "#2F7F8C"];
const DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type SlotDraft = { id?: string; weekday: number; start: string; end: string; room: string };
const emptySlot = (): SlotDraft => ({ weekday: 1, start: "", end: "", room: "" });

/** เพิ่ม (ไม่มี ?id) หรือแก้วิชา (?id=…) พร้อมเวลาเรียนซ้ำทุกสัปดาห์ */
export default function EditSubject() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const existing = subjects.data?.find((s) => s.id === id);

  // แก้วิชาเดิม: รอข้อมูลครบก่อน แล้วสร้างฟอร์มด้วยค่าเดิม (key = id → ไม่ต้อง setState ใน effect)
  if (id && (!existing || !slots.data)) {
    return <View style={{ flex: 1, backgroundColor: color.cream, padding: space.md }}><Skeleton height={300} /></View>;
  }
  return <SubjectForm key={id ?? "new"} termId={term.data?.id ?? ""} existing={existing} existingSlots={slots.data ?? []} />;
}

function SubjectForm({ termId, existing, existingSlots }: { termId: string; existing?: Subject; existingSlots: Slot[] }) {
  const id = existing?.id;
  const save = useSaveSubject(termId);
  const del = useDeleteSubject(termId);
  const mine = existingSlots.filter((s) => s.subject_id === id);

  const [code, setCode] = useState(existing?.code ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [col, setCol] = useState(existing?.color ?? COLORS[0]);
  const [drafts, setDrafts] = useState<SlotDraft[]>(() =>
    mine.length
      ? mine.map((s) => ({ id: s.id, weekday: s.weekday, start: hhmm(s.start_time), end: hhmm(s.end_time), room: s.room ?? "" }))
      : [emptySlot()]);
  const [links, setLinks] = useState({
    classroom: existing?.classroom_url ?? "", line: existing?.line_url ?? "", notebooklm: existing?.notebooklm_url ?? "",
  });
  const [tried, setTried] = useState(false);

  const patch = (i: number, p: Partial<SlotDraft>) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const slotError = (d: SlotDraft) => {
    const a = normTime(d.start);
    const b = normTime(d.end);
    if (!a || !b) return "ใส่เวลาแบบ 10:00";
    return a >= b ? "เวลาจบต้องหลังเวลาเริ่ม" : null;
  };
  const urls = { classroom: normUrl(links.classroom), line: normUrl(links.line), notebooklm: normUrl(links.notebooklm) };
  const errName = !name.trim() ? "ใส่ชื่อวิชา" : null;
  const hasError = !!errName || drafts.some((d) => slotError(d)) || Object.values(urls).some((u) => u === undefined);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/subjects"));

  const onSave = () => {
    setTried(true);
    if (hasError || !termId) return;
    const slotInputs: SlotInput[] = drafts.map((d) => ({
      id: d.id, weekday: d.weekday, start_time: normTime(d.start)!, end_time: normTime(d.end)!, room: d.room.trim() || null,
    }));
    save.mutate(
      {
        id: existing?.id, code: code.trim() || null, name: name.trim(), color: col,
        classroom_url: urls.classroom ?? null, line_url: urls.line ?? null, notebooklm_url: urls.notebooklm ?? null,
        slots: slotInputs,
      },
      { onSuccess: back },
    );
  };

  const removeSlot = (i: number) => {
    const go = () => setDrafts((d) => d.filter((_, j) => j !== i));
    // ช่วงเวลาที่บันทึกแล้วผูกกับการเช็กชื่อ → ลบแล้วการเช็กชื่อของช่วงนั้นหายด้วย
    if (drafts[i].id) confirmAction("ลบช่วงเวลานี้? การเช็กชื่อของช่วงนี้จะถูกลบด้วยเมื่อกดบันทึก", go);
    else go();
  };

  const onDelete = () =>
    existing && confirmAction(`ลบวิชา "${existing.name}"? งาน การเช็กชื่อ และข้อมูลทั้งหมดของวิชานี้จะหายถาวร`, () =>
      del.mutate(existing.id, { onSuccess: () => router.replace("/subjects") }));

  return (
    <View style={{ flex: 1, backgroundColor: color.cream }}>
      <View style={s.top}>
        <Pressable onPress={back} style={s.back} accessibilityRole="button"><Text style={s.backText}>‹ ยกเลิก</Text></Pressable>
        <Text style={s.title}>{id ? "แก้วิชา" : "เพิ่มวิชา"}</Text>
      </View>

      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={s.two}>
          <Field label="รหัสวิชา" value={code} onChangeText={setCode} placeholder="CP352001" maxLength={20} autoCapitalize="characters" />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>สี</Text>
            <View style={s.swatches}>
              {COLORS.map((c) => (
                <Pressable key={c} onPress={() => setCol(c)} accessibilityRole="radio" accessibilityState={{ selected: col === c }}
                  accessibilityLabel={`สี ${c}`} style={[s.sw, { backgroundColor: c }, col === c && s.swOn]} />
              ))}
            </View>
          </View>
        </View>
        <Field label="ชื่อวิชา" value={name} onChangeText={setName} placeholder="การเขียนโปรแกรมเชิงวัตถุ" maxLength={80}
          error={tried ? errName : null} />

        <Text style={s.label}>เวลาเรียน (ซ้ำทุกสัปดาห์ · มีได้หลายช่วง)</Text>
        {drafts.map((d, i) => (
          <View key={d.id ?? "new" + i} style={s.slotbox}>
            <View style={s.days}>
              {DAYS.map((label, wd) => (
                <Pressable key={wd} onPress={() => patch(i, { weekday: wd })} accessibilityRole="radio"
                  accessibilityState={{ selected: d.weekday === wd }} style={[s.day, d.weekday === wd && s.dayOn]}>
                  <Text style={[s.dayText, d.weekday === wd && { color: color.white, fontFamily: font.bodyBold }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.slotRow}>
              <Field label="เริ่ม" value={d.start} onChangeText={(v) => patch(i, { start: v })} placeholder="10:00" maxLength={5} />
              <Field label="จบ" value={d.end} onChangeText={(v) => patch(i, { end: v })} placeholder="12:00" maxLength={5} />
              <Field label="ห้อง" value={d.room} onChangeText={(v) => patch(i, { room: v })} placeholder="SC9-604" maxLength={40} />
              {drafts.length > 1 && (
                <Pressable onPress={() => removeSlot(i)} style={s.x} accessibilityRole="button" accessibilityLabel="ลบช่วงเวลานี้">
                  <Text style={{ color: color.danger, fontSize: 18 }}>✕</Text>
                </Pressable>
              )}
            </View>
            {tried && slotError(d) && <Text style={s.error}>{slotError(d)}</Text>}
          </View>
        ))}
        <Btn label="+ เพิ่มช่วงเวลา" onPress={() => setDrafts((d) => [...d, emptySlot()])} />

        <Field label="Google Classroom (ไม่ใส่ก็ได้)" value={links.classroom} onChangeText={(v) => setLinks({ ...links, classroom: v })}
          autoCapitalize="none" keyboardType="url" error={tried && urls.classroom === undefined ? "ลิงก์ไม่ถูกต้อง" : null} />
        <Field label="กลุ่มไลน์ (ไม่ใส่ก็ได้)" value={links.line} onChangeText={(v) => setLinks({ ...links, line: v })}
          autoCapitalize="none" keyboardType="url" error={tried && urls.line === undefined ? "ลิงก์ไม่ถูกต้อง" : null} />
        <Field label="NotebookLM (ไม่ใส่ก็ได้)" value={links.notebooklm} onChangeText={(v) => setLinks({ ...links, notebooklm: v })}
          autoCapitalize="none" keyboardType="url" error={tried && urls.notebooklm === undefined ? "ลิงก์ไม่ถูกต้อง" : null} />
        {!termId && <Text style={s.error}>ต้องมีเทอมปัจจุบันก่อน (หน้าตั้งค่า)</Text>}
        {(save.error || del.error) && <Text style={s.error}>บันทึกไม่สำเร็จ: {(save.error ?? del.error)?.message}</Text>}
      </ScrollView>

      <View style={s.foot}>
        {existing && <Btn label="ลบวิชา" onPress={onDelete} style={{ flex: 0.5 }} />}
        <Btn kind="primary" label={save.isPending ? "กำลังบันทึก…" : "บันทึก"} onPress={onSave} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: { backgroundColor: color.blue, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  back: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  backText: { fontFamily: font.body, fontSize: 14, color: color.white },
  title: { fontFamily: font.heading, fontSize: 20, color: color.white },
  page: { padding: space.md, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  two: { flexDirection: "row", gap: space.sm },
  label: { fontFamily: font.body, fontSize: 13, color: color.sub, marginTop: space.md, marginBottom: 6 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sw: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: "transparent" },
  swOn: { borderColor: color.ink },
  slotbox: { backgroundColor: color.white, borderWidth: 1, borderColor: color.line, borderRadius: radius.lg, padding: space.sm, marginBottom: space.sm },
  days: { flexDirection: "row", gap: 4 },
  day: { flex: 1, minHeight: minTouch, borderWidth: 1, borderColor: color.line, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  dayOn: { backgroundColor: color.blue, borderColor: color.blue },
  dayText: { fontFamily: font.body, fontSize: 13, color: color.ink },
  slotRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-end" },
  x: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: font.body, fontSize: 13, color: color.danger, marginTop: space.sm },
  foot: { flexDirection: "row", gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.cream },
});
