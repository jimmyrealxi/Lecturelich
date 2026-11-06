/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { cutoffError, DEFAULT_CUTOFFS, gradeFor, needOnFinal, toComponents, weightedTotal, type Component } from "./grades.ts";

// ตัวอย่างจาก mockup: เก็บ 30 (ได้ 24/30) กลางภาค 30 (ได้ 18/30) ปลายภาค 40 (เต็ม 40)
const oop: Component[] = [
  { name: "เก็บ", weight: 30, max: 30, score: 24 },
  { name: "กลางภาค", weight: 30, max: 30, score: 18 },
  { name: "ปลายภาค", weight: 40, max: 40, score: null, isFinal: true },
];

test("weightedTotal รวมเฉพาะส่วนที่มีคะแนน", () => {
  assert.equal(weightedTotal(oop), 42);
  // คะแนนเต็มไม่เท่า weight: 30/50 ของ 30% = 18
  assert.equal(weightedTotal([{ name: "x", weight: 30, max: 50, score: 30 }]), 18);
});

test("gradeFor ตามเกณฑ์ค่าเริ่มต้น และขอบเกณฑ์พอดี", () => {
  assert.equal(gradeFor(80), "A");
  assert.equal(gradeFor(79.99), "B+");
  assert.equal(gradeFor(50), "D");
  assert.equal(gradeFor(49.5), "F");
  assert.equal(gradeFor(70, { A: 70, B: 60 }), "A");
});

test("needOnFinal: ตัวเลขตรงกับที่คิดมือ", () => {
  // A ต้องรวม 80 → ขาด 38 จาก 40% → ต้องได้ 38/40
  assert.deepEqual(needOnFinal(oop, "A"), { needed: 38, max: 40, possible: true, unscoredOthers: 0 });
  assert.equal(needOnFinal(oop, "B+")?.needed, 33);
  assert.equal(needOnFinal(oop, "B")?.needed, 28);
});

test("needOnFinal: เป็นไปไม่ได้ / ได้แล้ว / ปัดขึ้น", () => {
  const low: Component[] = [{ name: "เก็บ", weight: 50, max: 50, score: 10 }, { name: "ปลาย", weight: 50, max: 100, score: null, isFinal: true }];
  // ต้องการ 80 มี 10 → ขาด 70 จาก 50% → 140/100 เกินเต็ม
  assert.equal(needOnFinal(low, "A")?.possible, false);
  assert.equal(needOnFinal(low, "D")?.needed, 80);
  const high: Component[] = [{ name: "เก็บ", weight: 90, max: 90, score: 90 }, { name: "ปลาย", weight: 10, max: 10, score: null, isFinal: true }];
  assert.equal(needOnFinal(high, "A")?.needed, 0);
  // ปัดขึ้นทศนิยม 2 ตำแหน่ง: มี 49 อยากได้ C (60) ขาด 11 จาก 30% ของเต็ม 40 = 14.666… → 14.67
  const frac: Component[] = [{ name: "a", weight: 70, max: 70, score: 79 - 30 }, { name: "f", weight: 30, max: 40, score: null, isFinal: true }];
  assert.equal(needOnFinal(frac, "C")?.needed, 14.67);
});

test("needOnFinal: นับส่วนที่ยังไม่มีคะแนน และไม่มีปลายภาค = null", () => {
  const pending = oop.map((c) => (c.name === "กลางภาค" ? { ...c, score: null } : c));
  assert.equal(needOnFinal(pending, "A")?.unscoredOthers, 1);
  assert.equal(needOnFinal(oop.slice(0, 2), "A"), null);
  assert.equal(needOnFinal(oop, "Z"), null);
});

test("toComponents: รวมคะแนนในส่วน ไม่เกินเต็ม · ไม่มีรายการ = null", () => {
  const c = toComponents([
    { name: "เก็บ", weight: 30, max_score: 30, is_final: false, scores: [{ score: 9, max_score: 10 }, { score: 15, max_score: 20 }] },
    { name: "กลาง", weight: 30, max_score: 30, is_final: false, scores: [{ score: "18" as unknown as number, max_score: 30 }] },
    { name: "โบนัสล้น", weight: 10, max_score: 10, is_final: false, scores: [{ score: 12, max_score: 10 }] },
    { name: "ปลาย", weight: 40, max_score: 40, is_final: true, scores: [] },
  ]);
  assert.deepEqual(c.map((x) => x.score), [24, 18, 10, null]);
  assert.equal(c[3].isFinal, true);
  assert.equal(weightedTotal(c.slice(0, 2)), 42);
});

test("cutoffError: ต้องเรียงลดลงและอยู่ใน 0–100", () => {
  assert.equal(cutoffError(DEFAULT_CUTOFFS), null);
  assert.match(cutoffError({ ...DEFAULT_CUTOFFS, B: 76 })!, /B/);
  assert.match(cutoffError({ ...DEFAULT_CUTOFFS, A: 101 })!, /A/);
  assert.match(cutoffError({ ...DEFAULT_CUTOFFS, D: NaN })!, /D/);
});
