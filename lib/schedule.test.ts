/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attendanceRisk,
  attendanceStats,
  bangkokNow,
  classState,
  countSessions,
  currentOrNext,
  endedWithoutNote,
  nextClassDate,
  announcements,
  slotsOn,
  urgentTask,
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

test("urgentTask: เลยกำหนดนานสุดก่อน แล้วใกล้ส่งสุดภายใน 3 วัน ไม่รวมงานส่งแล้ว/ไม่มีกำหนด", () => {
  const t = (id: string, due_at: string | null, done = false) => ({ id, due_at, done });
  const today = "2026-11-09";
  const late = t("late", "2026-11-07T10:00:00+07:00");
  const soon = t("soon", "2026-11-10T10:00:00+07:00");
  const edge = t("edge", "2026-11-12T23:59:00+07:00"); // อีก 3 วันพอดี
  const far = t("far", "2026-11-13T00:00:00+07:00");
  assert.equal(urgentTask([soon, late, far], today)?.id, "late");
  assert.equal(urgentTask([far, soon], today)?.id, "soon");
  assert.equal(urgentTask([far, edge], today)?.id, "edge");
  assert.equal(urgentTask([far, t("done", "2026-11-09T10:00:00+07:00", true), t("none", null)], today), null);
});

test("attendanceRisk: ต้องขาดแล้ว · ขาดได้อีกน้อยสุดมาก่อน", () => {
  const r = (id: string, absent: number, remaining: number) => ({ id, stats: { absent, remaining } });
  assert.equal(attendanceRisk([r("a", 2, 1), r("b", 4, -1), r("c", 1, 2), { id: "x", stats: null }])?.id, "b");
  assert.equal(attendanceRisk([r("a", 0, 1), r("c", 1, 2)]), null); // ยังไม่เคยขาด ไม่เตือน
});

test("คาบชดเชย: ขึ้นเฉพาะวันนั้น นับครั้งเดียว นอกเทอมไม่นับ", () => {
  const makeup = { ...slot("mk", 6, "13:00", "15:00"), makeup_date: "2026-11-21" };
  assert.deepEqual(slotsOn("2026-11-21", [makeup], term).map((s) => s.id), ["mk"]);
  assert.deepEqual(slotsOn("2026-11-28", [makeup], term), []); // เสาร์ถัดไปไม่มี
  assert.equal(countSessions([slot("a", 1, "10:00", "12:00"), makeup], term), 18);
  assert.equal(countSessions([{ ...makeup, makeup_date: "2027-04-03" }], term), 0);
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

test("nextClassDate: คาบถัดไปของวิชาหลังวันนั้น ไม่นับวันเดียวกัน · คาบชดเชยนับด้วย · ไม่มีคาบ = null", () => {
  assert.equal(nextClassDate("2026-11-09", "s-oop", slots, term), "2026-11-16");
  assert.equal(nextClassDate("2026-11-09", "s-net", slots, term), "2026-11-11");
  const mk = { ...slot("mk", 6, "13:00", "15:00"), subject_id: "s-oop", makeup_date: "2026-11-14" };
  assert.equal(nextClassDate("2026-11-09", "s-oop", [...slots, mk], term), "2026-11-14");
  assert.equal(nextClassDate("2026-11-09", "s-none", slots, term), null);
  assert.equal(nextClassDate("2027-03-06", "s-oop", slots, term), null); // หมดเทอม
});

test("announcements: โน้ตล่าสุดที่มีประกาศต่อวิชา · หายหลังวันคาบถัดไป · เรียงใกล้สุดก่อน", () => {
  const n = (subject_id: string, date: string, next_text: string | null) => ({ subject_id, date, next_text });
  const notes = [
    n("s-oop", "2026-11-09", "สอบย่อย บท 1-3"),
    n("s-oop", "2026-11-02", "อันเก่า"),
    n("s-net", "2026-11-11", "ส่งแบบฝึกหัด"),
    n("s-dis", "2026-11-09", "  "),
  ];
  // 11 พ.ย.: oop คาบหน้า 16 · net คาบหน้า 18 · dis ว่าง = ไม่โชว์
  assert.deepEqual(announcements(notes, slots, term, "2026-11-11").map((a) => [a.note.next_text, a.on]),
    [["สอบย่อย บท 1-3", "2026-11-16"], ["ส่งแบบฝึกหัด", "2026-11-18"]]);
  // วันคาบยังโชว์ · พ้นวันแล้วหาย (ไม่ย้อนไปใช้อันเก่า)
  assert.equal(announcements(notes, slots, term, "2026-11-16")[0].on, "2026-11-16");
  assert.deepEqual(announcements(notes, slots, term, "2026-11-17").map((a) => a.note.subject_id), ["s-net"]);
});
