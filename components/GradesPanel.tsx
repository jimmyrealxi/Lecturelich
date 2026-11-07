import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Btn, Card, Field, Skeleton, T, confirmAction } from "@/components/ui";
import { type Subject } from "@/lib/queries/core";
import {
  useAddScore, useDeleteComponent, useDeleteScore, useGradeComponents, useSaveComponents, useUpdateSubjectGrade,
  type ComponentInput, type GradeComponent,
} from "@/lib/queries/grades";
import { DEFAULT_CUTOFFS, cutoffError, gradeFor, needOnFinal, toComponents, weightedTotal, type Cutoffs } from "@/lib/grades";
import { color, font, minTouch, radius, space } from "@/lib/theme";

// ส่วน "คะแนนและเกรด" ในหน้าวิชา (mockup docs/mockups/stage3.html)

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
  const [editing, setEditing] = useState<string | null>(null); // id ส่วนที่แก้ · "new" = เพิ่มใหม่ · "cutoffs"
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
  const lower = grades.slice(grades.indexOf(subject.target_grade) + 1, grades.indexOf(subject.target_grade) + 3);

  return (
    <View>
      {rows.length > 0 && (
        <Card>
          <Text style={T.muted}>คะแนนตอนนี้ (จากส่วนที่มีคะแนนแล้ว)</Text>
          <Text style={s.big}>
            {fmt(total)} <Text style={T.muted}>/ {fmt(scoredWeight)} · ถ้าจบตอนนี้ได้ {gradeFor(total, cutoffs)}</Text>
          </Text>
          <View style={s.bar}><View style={[s.barFill, { width: `${scoredWeight ? Math.min(100, (total / scoredWeight) * 100) : 0}%` }]} /></View>
          {Math.abs(weightSum - 100) > 0.001 && (
            <Text style={[T.muted, { color: color.danger, marginTop: space.sm }]}>สัดส่วนรวมตอนนี้ {fmt(weightSum)}% (ควรเป็น 100%)</Text>
          )}
        </Card>
      )}

      <View style={s.need}>
        <Text style={s.needSmall}>เกรดเป้าหมาย</Text>
        <View style={s.chips}>
          {grades.map((g) => (
            <Pressable key={g} onPress={() => upd.mutate({ id: subject.id, target_grade: g })}
              style={[s.chip, g === subject.target_grade && s.chipOn]} accessibilityRole="radio"
              accessibilityState={{ selected: g === subject.target_grade }}>
              <Text style={[s.chipText, g === subject.target_grade && { color: color.paper }]}>{g}</Text>
            </Pressable>
          ))}
        </View>
        {!need ? (
          <Text style={[s.needSmall, { marginTop: space.md }]}>เพิ่มส่วนคะแนนและตั้งส่วนหนึ่งเป็น &quot;ปลายภาค&quot; เพื่อดูว่าต้องได้เท่าไหร่</Text>
        ) : (
          <>
            <Text style={[s.needSmall, { marginTop: space.md }]}>
              {need.needed === 0 ? `ได้ ${subject.target_grade} แล้ว แม้ปลายภาคได้ 0` : need.possible ? "ปลายภาคต้องได้อย่างน้อย" : `ปลายภาคเต็มก็ยังไม่ถึง ${subject.target_grade} — ต้องได้`}
            </Text>
            {need.needed > 0 && (
              <Text style={s.needBig}>{fmt(need.needed)} <Text style={s.needSmall}>/ {fmt(need.max)} คะแนน</Text></Text>
            )}
            {lower.length > 0 && (
              <Text style={s.needSmall}>
                {lower.map((g) => `ได้ ${g} ต้อง ${fmt(needOnFinal(list, g, cutoffs)!.needed)}`).join(" · ")}
              </Text>
            )}
            {need.unscoredOthers > 0 && (
              <Text style={s.needSmall}>ยังมี {need.unscoredOthers} ส่วนที่ไม่มีคะแนน (นับเป็น 0)</Text>
            )}
          </>
        )}
      </View>

      {rows.length === 0 && editing !== "new" && (
        <Card>
          <Text style={T.muted}>ยังไม่มีส่วนคะแนน</Text>
          <View style={[s.row, { marginTop: space.sm }]}>
            <Btn kind="primary" label="ใช้แบบ เก็บ 30 · กลาง 30 · ปลาย 40"
              onPress={() => !save.isPending && save.mutate(TEMPLATE.map((c, i) => ({ ...c, sort: i })))} />
          </View>
        </Card>
      )}

      {rows.map((c, i) =>
        editing === c.id ? (
          <ComponentForm key={c.id} subjectId={subject.id} existing={c} onDone={() => setEditing(null)} sort={c.sort} />
        ) : (
          <ComponentCard key={c.id} subjectId={subject.id} comp={c} sum={list[i].score} onEdit={() => setEditing(c.id)} />
        ),
      )}
      {editing === "new" && (
        <ComponentForm key="new" subjectId={subject.id} onDone={() => setEditing(null)}
          sort={rows.reduce((m, c) => Math.max(m, c.sort + 1), 0)} />
      )}
      {editing === "cutoffs" && (
        <CutoffForm key={JSON.stringify(cutoffs)} cutoffs={cutoffs} onDone={() => setEditing(null)}
          onSave={(grade_cutoffs) => upd.mutate({ id: subject.id, grade_cutoffs })} />
      )}

      <View style={s.row}>
        <Btn label="+ เพิ่มส่วนคะแนน" onPress={() => setEditing("new")} />
        <Btn label="เกณฑ์ตัดเกรด" onPress={() => setEditing("cutoffs")} />
      </View>
    </View>
  );
}

function ComponentCard({ subjectId, comp, sum, onEdit }: {
  subjectId: string; comp: GradeComponent; sum: number | null; onEdit: () => void;
}) {
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
    <Card>
      <View style={s.between}>
        <Text style={T.h3}>{comp.name}{comp.is_final ? "  · ปลายภาค" : ""}</Text>
        <Text style={T.muted}>
          {fmt(Number(comp.weight))}% · {sum == null ? "ยังไม่มีคะแนน"
            : `${fmt(comp.scores.reduce((t, x) => t + Number(x.score), 0))}/${fmt(comp.scores.reduce((t, x) => t + Number(x.max_score), 0))}`
              + ` → ${fmt(sum)}/${fmt(Number(comp.max_score))}`}
        </Text>
      </View>
      {comp.scores.map((x) => (
        <View key={x.id} style={s.item}>
          <Text style={[T.body, { flex: 1 }]}>{x.title || "คะแนน"}</Text>
          <Text style={[T.body, { fontFamily: font.bodyBold }]}>{fmt(Number(x.score))}/{fmt(Number(x.max_score))}</Text>
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
      <View style={[s.row, { marginTop: space.sm }]}>
        <Btn label="แก้ส่วนนี้" onPress={onEdit} />
        <Btn kind="primary" label="+ เพิ่มคะแนน" onPress={onAdd} />
      </View>
    </Card>
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
      <Text style={[T.muted, { fontSize: 12, marginTop: 4 }]}>
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
  big: { fontFamily: font.bodyBold, fontSize: 26, color: color.paper },
  bar: { height: 8, backgroundColor: color.rule, borderRadius: 4, overflow: "hidden", marginTop: space.sm },
  barFill: { height: "100%", backgroundColor: color.go },
  need: { backgroundColor: color.navy, borderRadius: radius.lg, padding: space.md, marginBottom: space.md },
  needSmall: { fontFamily: font.body, fontSize: 13, color: color.onNavy, opacity: 0.9 },
  needBig: { fontFamily: font.bodyBold, fontSize: 26, color: color.onNavy },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  chip: {
    minWidth: minTouch, minHeight: minTouch, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm,
  },
  chipOn: { backgroundColor: color.go, borderColor: color.go },
  chipText: { fontFamily: font.bodyBold, fontSize: 14, color: color.onNavy },
  row: { flexDirection: "row", gap: space.sm },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  item: { flexDirection: "row", alignItems: "center", minHeight: minTouch, borderTopWidth: 1, borderTopColor: color.rule, gap: space.sm },
  x: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: font.body, fontSize: 13, color: color.muted, marginTop: space.md, marginBottom: 6 },
  err: { fontFamily: font.body, fontSize: 13, color: color.danger, marginTop: space.sm },
});
