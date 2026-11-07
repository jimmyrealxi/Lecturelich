/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { BOSS_CONFIG, termBoss } from "./boss.ts";

const base = { start: "2026-11-01", lastExam: "2026-11-10", midterm: "2026-11-05", today: "2026-11-01", termXp: 0 };
const full = 10 * BOSS_CONFIG.expectedXpPerDay;

test("termBoss: เลือดเต็ม = XP ที่คาดว่าได้ทั้งเทอม · ลดตาม XP จริง", () => {
  const b = termBoss(base);
  assert.equal(b.maxHp, full);
  assert.equal(b.hp, full);
  assert.equal(b.stage, "start");
  assert.equal(termBoss({ ...base, termXp: 120 }).hp, full - 120);
});

test("termBoss: ไม่ถึง 0 ก่อนวันสอบสุดท้าย แม้ XP เกิน · ตายวันสอบสุดท้าย", () => {
  const b = termBoss({ ...base, today: "2026-11-09", termXp: full * 3 });
  assert.equal(b.dead, false);
  assert.equal(b.hp, Math.ceil(full * BOSS_CONFIG.minHpBeforeEnd));
  assert.equal(b.stage, "end");
  const d = termBoss({ ...base, today: "2026-11-10" });
  assert.deepEqual([d.dead, d.hp, d.stage], [true, 0, "dead"]);
});

test("termBoss: ช่วงเทอม + ขีดเฟสกลางภาค", () => {
  assert.equal(termBoss({ ...base, today: "2026-11-05" }).stage, "mid");
  assert.equal(termBoss(base).phase, 0.5);
  assert.equal(termBoss({ ...base, midterm: null }).phase, null);
  assert.equal(termBoss({ ...base, today: "2026-10-20" }).stage, "start"); // ก่อนเปิดเทอม
});
