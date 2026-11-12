import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { AddBtn, Btn, Card, Field, Skeleton, T, confirmAction } from "@/components/ui";
import { type Subject } from "@/lib/queries/core";
import {
  useAddScore, useDeleteComponent, useDeleteScore, useGradeComponents, useSaveComponents, useUpdateSubjectGrade,
  type ComponentInput, type GradeComponent,
} from "@/lib/queries/grades";
import { DEFAULT_CUTOFFS, cutoffError, needOnFinal, toComponents, weightedTotal, type Cutoffs } from "@/lib/grades";
import { color, font, minTouch, radius, space } from "@/lib/theme";

// ส่วน "คะแนน" ในหน้าวิชา (docs/mockups/a-subject-page.html) · แต่ละส่วนยุบเป็นแถว แตะค่อยกาง · เป้า = ตรายาง

const fmt = (n: number) => String(Math.round(n * 100) / 100);
const num = (t: string) => (t.trim() === "" ? NaN : Number(t.trim()));
const TEMPLATE: Omit<ComponentInput, "sort">[] = [
  { name: "คะแนนเก็บ", weight: 30, max_score: 30, is_final: false },
  { name: "กลางภาค", weight: 30, max_score: 30, is_final: false },
  { name: "ปลายภาค", weight: 40, max_score: 40, is_final: true },
];

export function GradesPanel({ subject, termId }: { subject: Subject; termId: string }) {
  const q = useGradeComponents(subject.id);
  const save = useSaveComponents(subject.id);
  const upd = useUpdateSubjectGrade(termId);
  const [open, setOpen] = useState<string | null>(null); // id ส่วนที่กางอยู่ · "new" = ฟอร์มเพิ่มส่วน
  const [editing, setEditing] = useState(false); // แก้ชื่อ/สัดส่วนของส่วนที่กางอยู่
  const [picking, setPicking] = useState(false); // ถาดตรายางเลือกเป้า
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const list = useMemo(() => toComponents(rows), [rows]);
  const cutoffs = subject.grade_cutoffs ?? DEFAULT_CUTOFFS;
  const grades = Object.keys(cutoffs).sort((a, b) => cutoffs[b] - cutoffs[a]);

  if (q.isPending) return <Skeleton height={160} />;
  if (q.isError) return <Card><Text style={T.muted}>โหลดคะแนนไม่สำเร็จ (ลองรีเฟรช)</Text></Card>;

  const total = weightedTotal(list);
  const scoredWeight = list.reduce((t, c) => (c.score == null ? t : t + c.weight), 0);
  const weightSum = list.reduce((t, c) => t + c.weight, 0);
  const need = needOnFinal(list, subject.target_grade, cutoffs);
  const g = subject.target_grade;
  const toggle = (id: string) => { setOpen(open === id ? null : id); setEditing(false); };

  return (
    <View>
      <View style={s.now}>
        <Text style={[T.body, { flex: 1 }]}>
          {scoredWeight > 0
            ? <>เก็บแล้ว <Text style={s.numBig}>{fmt(total)}/{fmt(scoredWeight)}</Text> ({Math.round((total / scoredWeight) * 100)}%)</>
            : "ยังไม่มีคะแนน"}
        </Text>
        <GradeStamp grade={g} open={picking} onPress={() => setPicking(!picking)} />
      </View>
      {picking && (
        <View style={s.tray} accessibilityRole="radiogroup" accessibilityLabel="เลือกเกรดเป้าหมาย">
          {grades.map((x, i) => (
            <Pressable key={x} onPress={() => { setPicking(false); if (x !== g) upd.mutate({ id: subject.id, target_grade: x }); }}
              style={({ pressed }) => [s.mini, { transform: [{ rotate: `${i % 2 ? 3 : -3}deg` }] }, x === g && s.miniOn, pressed && { opacity: 0.6 }]}
              accessibilityRole="radio" accessibilityState={{ selected: x === g }} accessibilityLabel={`เป้า ${x}`}>
              <Text style={[s.miniText, x === g && { color: color.red }]}>{x}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {rows.length > 0 && (
        <View style={s.need}>
          {!need ? (
            <Text style={T.body}>ตั้งส่วนหนึ่งเป็น &quot;ปลายภาค&quot; เพื่อดูว่าต้องได้เท่าไหร่</Text>
          ) : need.needed === 0 ? (
            <Text style={T.body}>ได้ {g} แล้ว แม้ปลายภาคได้ 0</Text>
          ) : need.possible ? (
            <Text style={T.body}>ปลายภาคต้องได้อย่างน้อย <Text style={s.numBold}>{fmt(need.needed)}/{fmt(need.max)}</Text> ถึงได้ {g}</Text>
          ) : (
            <Text style={[T.body, { color: color.danger }]}>ปลายภาคเต็มก็ยังไม่ถึง {g} (ต้องได้ <Text style={s.numBold}>{fmt(need.needed)}/{fmt(need.max)}</Text>)</Text>
          )}
          {Math.abs(weightSum - 100) > 0.001 && (
            <Text style={[T.muted, { color: color.danger, marginTop: 4 }]}>สัดส่วนรวมตอนนี้ {fmt(weightSum)}% (ควรเป็น 100%)</Text>
          )}
        </View>
      )}

      {rows.length === 0 && open !== "new" && (
        <View style={{ marginTop: space.sm }}>
          <Btn kind="primary" label="ใช้แบบ เก็บ 30 · กลาง 30 · ปลาย 40"
            onPress={() => !save.isPending && save.mutate(TEMPLATE.map((c, i) => ({ ...c, sort: i })))} />
        </View>
      )}

      {rows.map((c, i) => {
        const isOpen = open === c.id;
        const sum = list[i].score;
        return (
          <View key={c.id} style={[s.part, i === 0 && s.partFirst]}>
            <Pressable style={s.ph} onPress={() => toggle(c.id)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
              <Text style={s.pn} numberOfLines={1}>
                {c.name} <Text style={s.pw}>{fmt(Number(c.weight))}%{c.is_final && !c.name.includes("ปลายภาค") ? " · ปลายภาค" : ""}</Text>
              </Text>
              <Text style={s.pv}>{sum == null ? "–" : `${fmt(sum)}/${fmt(Number(c.max_score))}`}</Text>
              <Text style={[s.chev, isOpen && s.chevOn]} aria-hidden>▾</Text>
            </Pressable>
            {isOpen && (editing
              ? <ComponentForm subjectId={subject.id} existing={c} sort={c.sort} onDone={() => setEditing(false)} />
              : <PartBody subjectId={subject.id} comp={c} onEdit={() => setEditing(true)} />)}
          </View>
        );
      })}
      {open === "new" && (
        <ComponentForm key="new" subjectId={subject.id} onDone={() => setOpen(null)}
          sort={rows.reduce((m, c) => Math.max(m, c.sort + 1), 0)} />
      )}
      {open !== "new" && <AddBtn label="+ เพิ่มส่วนคะแนน" onPress={() => { setOpen("new"); setEditing(false); }} />}
    </View>
  );
}

/** ตรายางเป้าเกรด · เปลี่ยนเกรดแล้วกระแทกลงกระดาษ (scale+opacity · ลดการเคลื่อนไหว = ไม่ขยับ) */
function GradeStamp({ grade, open, onPress }: { grade: string; open: boolean; onPress: () => void }) {
  const hit = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (Platform.OS === "web" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    hit.setValue(0);
    Animated.timing(hit, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }).start();
  }, [grade, hit]);
  const scale = hit.interpolate({ inputRange: [0, 1], outputRange: [1.45, 1] });
  const opacity = hit.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.92] });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }}
      accessibilityLabel={`เกรดเป้าหมาย ${grade} แตะเพื่อเปลี่ยน`} style={({ pressed }) => [s.stampHit, pressed && { opacity: 0.7 }]}>
      <Animated.View style={[s.stamp, INK_WORN, { opacity, transform: [{ rotate: "-8deg" }, { scale }] }]}>
        <View style={s.stampIn}>
          <Text style={s.stampK}>เป้า</Text>
          <Text style={s.stampG}>{grade}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// หมึกตรายางกินไม่เต็ม: จุดโปร่งเล็ก ๆ ทั่วตรา (เว็บเท่านั้น)
const INK_WORN = (Platform.OS === "web" ? {
  maskImage: "radial-gradient(circle at 30% 40%, transparent 0.9px, #000 1.5px), radial-gradient(circle at 70% 70%, transparent 0.7px, #000 1.3px)",
  maskSize: "9px 11px, 13px 7px", maskComposite: "intersect", WebkitMaskComposite: "source-in",
} : {}) as ViewStyle;

function PartBody({ subjectId, comp, onEdit }: { subjectId: string; comp: GradeComponent; onEdit: () => void }) {
  const add = useAddScore(subjectId);
  const del = useDeleteScore(subjectId);
  const [title, setTitle] = useState("");
  const [score, setScore] = useState("");
  const [max, setMax] = useState("");
  const [tried, setTried] = useState(false);
  const errScore = !(num(score) >= 0) ? "ใส่คะแนน" : null;
  const errMax = !(num(max) > 0) ? "ใส่คะแนนเต็ม" : null;

  const onAdd = () => {
    setTried(true);
    if (errScore || errMax) return;
    add.mutate({ component_id: comp.id, title: title.trim() || null, score: num(score), max_score: num(max) });
    setTitle(""); setScore(""); setMax(""); setTried(false);
  };

  return (
    <View style={s.body}>
      {comp.scores.map((x) => (
        <View key={x.id} style={s.item}>
          <Text style={[T.body, { flex: 1 }]}>{x.title || "คะแนน"}</Text>
          <Text style={[T.body, { fontFamily: font.typeBold }]}>{fmt(Number(x.score))}/{fmt(Number(x.max_score))}</Text>
          <Pressable style={s.x} accessibilityRole="button" accessibilityLabel={`ลบ ${x.title || "คะแนน"}`}
            onPress={() => confirmAction(`ลบคะแนน "${x.title || "คะแนน"}"?`, () => del.mutate(x.id))}>
            <Text style={T.muted}>✕</Text>
          </Pressable>
        </View>
      ))}
      <View style={s.row}>
        <Field label="ชื่อ (ไม่ใส่ก็ได้)" value={title} onChangeText={setTitle} placeholder="ควิซ 1" maxLength={60} style={{ flex: 2 }} />
        <Field label="ได้" value={score} onChangeText={setScore} keyboardType="decimal-pad" maxLength={6} error={tried ? errScore : null} />
        <Field label="เต็ม" value={max} onChangeText={setMax} keyboardType="decimal-pad" maxLength={6} error={tried ? errMax : null} />
      </View>
      <Text style={[T.muted, { marginTop: 4 }]}>ได้ 0 ก็ใส่ 0 (ไม่ใส่ = ไม่นับ)</Text>
      <View style={[s.row, { marginTop: space.sm }]}>
        <Btn label="แก้ส่วนนี้" onPress={onEdit} />
        <Btn kind="primary" label="+ เพิ่มคะแนน" onPress={onAdd} />
      </View>
    </View>
  );
}

/** เกณฑ์ตัดเกรดในตั้งค่าวิชา */
export function CutoffSettings({ subject, termId }: { subject: Subject; termId: string }) {
  const upd = useUpdateSubjectGrade(termId);
  const [editing, setEditing] = useState(false);
  const cutoffs = subject.grade_cutoffs ?? DEFAULT_CUTOFFS;
  if (editing) {
    return <CutoffForm key={JSON.stringify(cutoffs)} cutoffs={cutoffs} onDone={() => setEditing(false)}
      onSave={(grade_cutoffs) => upd.mutate({ id: subject.id, grade_cutoffs })} />;
  }
  const order = Object.keys(cutoffs).sort((a, b) => cutoffs[b] - cutoffs[a]);
  return (
    <View>
      <Text style={T.body}>
        {subject.grade_cutoffs ? "" : "มาตรฐาน · "}
        {order.map((x, i) => <Text key={x}>{i ? " · " : ""}{x} <Text style={s.numBold}>{cutoffs[x]}</Text></Text>)}
      </Text>
      <AddBtn label="แก้เกณฑ์" onPress={() => setEditing(true)} />
    </View>
  );
}

function ComponentForm({ subjectId, existing, sort, onDone }: {
  subjectId: string; existing?: GradeComponent; sort: number; onDone: () => void;
}) {
  const save = useSaveComponents(subjectId);
  const del = useDeleteComponent(subjectId);
  const [name, setName] = useState(existing?.name ?? "");
  const [weight, setWeight] = useState(existing ? fmt(Number(existing.weight)) : "");
  const [max, setMax] = useState(existing ? fmt(Number(existing.max_score)) : "");
  const [isFinal, setIsFinal] = useState(existing?.is_final ?? false);
  const [tried, setTried] = useState(false);
  const errName = !name.trim() ? "ใส่ชื่อ" : null;
  const w = num(weight);
  const errWeight = !(w > 0 && w <= 100) ? "1–100" : null;
  const errMax = max.trim() && !(num(max) > 0) ? "มากกว่า 0" : null; // ว่าง = ใช้ค่าสัดส่วน

  const onSave = () => {
    setTried(true);
    if (errName || errWeight || errMax) return;
    const maxScore = max.trim() ? num(max) : w;
    save.mutate([{ id: existing?.id, name: name.trim(), weight: w, max_score: maxScore, is_final: isFinal, sort }], { onSuccess: onDone });
  };

  return (
    <Card>
      <Text style={T.h3}>{existing ? "แก้ส่วนคะแนน" : "เพิ่มส่วนคะแนน"}</Text>
      <Field label="ชื่อ" value={name} onChangeText={setName} placeholder="กลางภาค" maxLength={40} error={tried ? errName : null} />
      <View style={s.row}>
        <Field label="สัดส่วน (%)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={6} error={tried ? errWeight : null} />
        <Field label="คะแนนเต็ม (ไม่รู้ก็เว้นว่าง)" value={max} onChangeText={setMax} keyboardType="decimal-pad" maxLength={6}
          placeholder={weight || "30"} error={tried ? errMax : null} />
      </View>
      <Text style={[T.muted, { marginTop: 4 }]}>
        กรอกคะแนนทีละงานตามที่อาจารย์ให้ (เช่น 8/10) แอปจะแปลงเป็นสัดส่วนของส่วนนี้เอง
      </Text>
      <Text style={s.label}>ใช้คำนวณ &quot;ปลายภาคต้องได้เท่าไหร่&quot;</Text>
      <View style={s.row}>
        <Btn label="ใช่ ส่วนนี้คือปลายภาค" selected={isFinal} onPress={() => setIsFinal(true)} />
        <Btn label="ไม่ใช่" selected={!isFinal} onPress={() => setIsFinal(false)} />
      </View>
      {save.isError && <Text style={s.err}>บันทึกไม่สำเร็จ ลองอีกครั้ง</Text>}
      <View style={[s.row, { marginTop: space.md }]}>
        {existing && (
          <Btn label="ลบ" onPress={() => confirmAction(`ลบ "${existing.name}" และคะแนนในส่วนนี้ทั้งหมด?`,
            () => del.mutate(existing.id, { onSuccess: onDone }))} />
        )}
        <Btn label="ยกเลิก" onPress={onDone} />
        <Btn kind="primary" label={save.isPending ? "กำลังบันทึก…" : "บันทึก"} onPress={onSave} />
      </View>
    </Card>
  );
}

function CutoffForm({ cutoffs, onSave, onDone }: { cutoffs: Cutoffs; onSave: (c: Cutoffs) => void; onDone: () => void }) {
  const order = Object.keys(DEFAULT_CUTOFFS);
  const toText = (c: Cutoffs) => Object.fromEntries(order.map((g) => [g, c[g] == null ? "" : String(c[g])]));
  const [vals, setVals] = useState<Record<string, string>>(toText(cutoffs));
  const [tried, setTried] = useState(false);
  const parsed = Object.fromEntries(order.map((g) => [g, num(vals[g])]));
  const err = cutoffError(parsed, order);

  return (
    <Card>
      <Text style={T.h3}>เกณฑ์ตัดเกรด (คะแนนรวมขั้นต่ำ)</Text>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {order.map((g) => (
          <Field key={g} label={g} value={vals[g]} onChangeText={(t) => setVals({ ...vals, [g]: t })}
            keyboardType="decimal-pad" maxLength={5} style={{ flexBasis: "22%", flexGrow: 1 }} />
        ))}
      </View>
      <Text style={[T.muted, { marginTop: space.sm }]}>ต้องเรียงจากมากไปน้อย · ต่ำกว่า D = F</Text>
      {tried && err && <Text style={s.err}>{err}</Text>}
      <View style={[s.row, { marginTop: space.md }]}>
        <Btn label="ค่าเริ่มต้น" onPress={() => setVals(toText(DEFAULT_CUTOFFS))} />
        <Btn label="ยกเลิก" onPress={onDone} />
        <Btn kind="primary" label="บันทึก" onPress={() => {
          setTried(true);
          if (err) return;
          onSave(parsed);
          onDone(); // optimistic: เกณฑ์ใหม่ใช้คำนวณทันที
        }} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  now: { flexDirection: "row", alignItems: "center", gap: space.md, paddingTop: 4, paddingBottom: space.sm },
  numBig: { fontFamily: font.typeBold, fontSize: 19, color: color.paper },
  numBold: { fontFamily: font.typeBold, color: color.paper },
  // ตรายางแดง ขอบคู่ เอียง
  stampHit: { minWidth: 76, minHeight: 72, alignItems: "center", justifyContent: "center" },
  stamp: { borderWidth: 3, borderColor: color.red, borderRadius: 7, padding: 3 },
  stampIn: { borderWidth: 1, borderColor: color.red, borderRadius: 4, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 4, alignItems: "center" },
  stampK: { fontFamily: font.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 2, color: color.red },
  stampG: { fontFamily: font.title, fontSize: 30, lineHeight: 38, color: color.red },
  tray: { flexDirection: "row", gap: 4, paddingVertical: space.sm, marginBottom: space.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.rule },
  mini: { flex: 1, minHeight: minTouch, borderWidth: 2, borderColor: color.muted, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  miniOn: { borderColor: color.red, backgroundColor: "rgba(160,40,29,0.08)" },
  miniText: { fontFamily: font.title, fontSize: 16, lineHeight: 24, color: color.muted },
  need: { backgroundColor: color.deck, borderWidth: 1, borderColor: color.rule2, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, marginBottom: space.sm },
  part: { borderBottomWidth: 1, borderBottomColor: color.rule },
  partFirst: { borderTopWidth: 1, borderTopColor: color.rule },
  ph: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 52 },
  pn: { flex: 1, fontFamily: font.bodyBold, fontSize: 16, color: color.paper },
  pw: { fontFamily: font.body, fontSize: 14, color: color.muted },
  pv: { fontFamily: font.typeBold, fontSize: 16, color: color.paper },
  chev: { fontSize: 16, color: color.paper, width: 18, textAlign: "center" },
  chevOn: { transform: [{ rotate: "180deg" }] },
  body: { paddingBottom: space.md },
  row: { flexDirection: "row", gap: space.sm },
  item: { flexDirection: "row", alignItems: "center", minHeight: minTouch, borderBottomWidth: 1, borderBottomColor: color.rule, borderStyle: "dashed", gap: space.sm },
  x: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: font.body, fontSize: 15, color: color.muted, marginTop: space.md, marginBottom: 6 },
  err: { fontFamily: font.body, fontSize: 15, color: color.danger, marginTop: space.sm },
});
