import assert from "node:assert/strict";
import { test } from "node:test";
import { guessSubject } from "./classroom.ts";
import { dueIso, isChanged, isCurrent, workFields, workKey, type Work } from "../supabase/functions/classroom/logic.ts";

const work = (extra: Partial<Work> = {}): Work => ({ id: "9", courseId: "1", title: " Lab ", ...extra });
const today = Date.parse("2026-11-09T00:00:00+07:00");

test("วันส่งเป็น UTC และรับ dueTime ที่ถูกตัดค่า 0", () => {
  assert.equal(dueIso(work()), null);
  assert.equal(dueIso(work({ dueDate: { year: 2026, month: 11, day: 9 }, dueTime: { hours: 16, minutes: 59 } })), "2026-11-09T16:59:00.000Z");
  assert.equal(dueIso(work({ dueDate: { year: 2026, month: 11, day: 9 }, dueTime: {} })), "2026-11-09T00:00:00.000Z");
  assert.equal(dueIso(work({ dueDate: { year: 2026, month: 11, day: 9 } })), "2026-11-09T00:00:00.000Z");
});

test("ตัดชื่อให้เข้า DB และใส่ชื่อแทนเมื่อว่าง", () => {
  assert.equal(workFields(work()).title, "Lab");
  assert.equal(workFields(work({ title: "ก".repeat(200) })).title.length, 120);
  assert.equal(workFields(work({ title: "  " })).title, "งานจาก Classroom");
  assert.equal(workKey(work()), "1/9");
});

test("ไม่ดึงงานเก่าที่เลยกำหนดก่อนวันนี้", () => {
  assert.equal(isCurrent(null, today), true);
  assert.equal(isCurrent("2026-11-08T16:59:00Z", today), false);
  assert.equal(isCurrent("2026-11-08T17:00:00Z", today), true);
});

test("เวลาเดียวกันคนละรูปแบบไม่นับว่าเปลี่ยน", () => {
  const a = workFields(work({ dueDate: { year: 2026, month: 11, day: 9 } }));
  assert.equal(isChanged({ ...a, due_at: "2026-11-09T00:00:00+00:00" }, a), false);
  assert.equal(isChanged({ ...a, title: "เดิม" }, a), true);
  assert.equal(isChanged({ ...a, due_at: null }, a), true);
});

test("เดาวิชาจากรหัสหรือชื่อ เลือกที่ยาวสุด", () => {
  const subjects = [
    { id: "a", name: "Network", code: null },
    { id: "b", name: "Computer Network", code: "CS301" },
    { id: "c", name: "คณิต", code: null },
  ];
  assert.equal(guessSubject("Computer Network 69T2", subjects), "b");
  assert.equal(guessSubject("cs-301 sec 1", subjects), "b");
  assert.equal(guessSubject("Calculus", subjects), null);
});
