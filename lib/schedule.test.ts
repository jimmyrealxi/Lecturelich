/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attendanceStats,
  bangkokNow,
  classState,
  countSessions,
  currentOrNext,
  endedWithoutNote,
  slotsOn,
  type Slot,
} from "./schedule.ts";

const slot = (id: string, weekday: number, start: string, end: string): Slot => ({
  id, subject_id: "s-" + id, weekday, start_time: start, end_time: end, room: null,
});
const term = { start_date: "2026-11-09", end_date: "2027-03-07" };
// จันทร์ 9 พ.ย. 2569 (2026)
const slots = [slot("oop", 1, "10:00:00", "12:00:00"), slot("dis", 1, "08:00", "10:00"), slot("net", 3, "13:00", "16:00")];

test("bangkokNow แปลงเวลา UTC เป็นเวลาไทย ข้ามวันถูก", () => {
  // 2026-11-08 20:30 UTC = จันทร์ 9 พ.ย. 03:30 ไทย
  assert.deepEqual(bangkokNow(new Date("2026-11-08T20:30:00Z")), { date: "2026-11-09", weekday: 1, minutes: 210 });
});

test("slotsOn เรียงตามเวลา และนอกเทอมไม่มีคาบ", () => {
  assert.deepEqual(slotsOn("2026-11-09", slots, term).map((s) => s.id), ["dis", "oop"]);
  assert.deepEqual(slotsOn("2026-11-02", slots, term), []); // ก่อนเปิดเทอม
  assert.deepEqual(slotsOn("2026-11-09", slots, null), []);
  assert.deepEqual(slotsOn("2026-11-10", slots, term), []); // อังคารไม่มีคาบ
});

test("classState: ขอบเวลาเริ่ม = live, ขอบเวลาจบ = ended", () => {
  const s = slots[0];
  assert.equal(classState(s, 599), "upcoming");
  assert.equal(classState(s, 600), "live");
  assert.equal(classState(s, 720), "ended");
});

test("currentOrNext", () => {
  const today = slotsOn("2026-11-09", slots, term);
  assert.equal(currentOrNext(today, 11 * 60 + 20)?.slot.id, "oop");
  assert.equal(currentOrNext(today, 11 * 60 + 20)?.state, "live");
  assert.equal(currentOrNext(today, 7 * 60)?.state, "upcoming");
  assert.equal(currentOrNext(today, 13 * 60), null);
});

test("endedWithoutNote ข้ามคาบที่จดแล้วและคาบไม่มีเรียน", () => {
  const today = slotsOn("2026-11-09", slots, term);
  assert.deepEqual(endedWithoutNote(today, 13 * 60, new Set(), new Map()).map((s) => s.id), ["dis", "oop"]);
  assert.deepEqual(endedWithoutNote(today, 13 * 60, new Set(["dis"]), new Map([["oop", "no_class"]])), []);
});

test("countSessions นับคาบทั้งเทอม (วิชาเดียวหลายช่วงต่อสัปดาห์)", () => {
  // 9 พ.ย. 2569 – 7 มี.ค. 2570 = 17 สัปดาห์พอดี
  assert.equal(countSessions([slot("a", 1, "10:00", "12:00")], term), 17);
  assert.equal(countSessions([slot("a", 1, "10:00", "12:00"), slot("b", 4, "13:00", "15:00")], term), 34);
});

test("attendanceStats: ไม่มีเรียนไม่นับ, เตือนเมื่อขาดได้อีก ≤ 1", () => {
  const st = attendanceStats(["present", "absent", "no_class", "present"], 16, 80);
  // นับ 15 คาบ → ขาดได้ floor(15*0.2) = 3
  assert.equal(st.maxAbsent, 3);
  assert.equal(st.remaining, 2);
  assert.equal(st.pct, 67);
  assert.equal(st.warn, false);
  assert.equal(attendanceStats(["absent", "absent"], 16).warn, true);
  assert.equal(attendanceStats([], 16).pct, 100);
});
