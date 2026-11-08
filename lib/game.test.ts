/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { grantXp, levelFromXp, submitXp, XP_CONFIG } from "./xp.ts";
import { afterReview, bossStatus, daysUntil, examOf, examReady, isMastered, nearExam, nodeState, REVIEW_DAYS, reviewQueue, upcomingExams, type Topic } from "./review.ts";

test("levelFromXp: ขึ้นเลเวลถัดไปใช้ 50 × เลเวลปัจจุบัน", () => {
  assert.deepEqual(levelFromXp(0), { level: 1, into: 0, need: 50 });
  assert.deepEqual(levelFromXp(49), { level: 1, into: 49, need: 50 });
  assert.deepEqual(levelFromXp(50), { level: 2, into: 0, need: 100 });
  assert.deepEqual(levelFromXp(150), { level: 3, into: 0, need: 150 });
  assert.equal(levelFromXp(-5).level, 1);
});

test("submitXp: ก่อน 1 วัน / ตรงเวลา / เลยกำหนด", () => {
  const due = "2026-11-12T16:59:00Z";
  assert.equal(submitXp(due, "2026-11-11T16:59:00Z"), XP_CONFIG.submitEarly);
  assert.equal(submitXp(due, "2026-11-12T10:00:00Z"), XP_CONFIG.submitOnTime);
  assert.equal(submitXp(due, "2026-11-12T17:00:00Z"), 0);
  assert.equal(submitXp(null, "2026-11-12T17:00:00Z"), XP_CONFIG.submitOnTime);
});

test("grantXp: เพดานต่อวันต่อวิชา และเพดานทวน 30", () => {
  assert.equal(grantXp(10, 0), 10);
  assert.equal(grantXp(10, XP_CONFIG.dailyCapPerSubject - 4), 4);
  assert.equal(grantXp(10, XP_CONFIG.dailyCapPerSubject), 0);
  assert.equal(grantXp(3, 0, 29, true), 1);
  assert.equal(grantXp(3, 0, 30, true), 0);
});

const day = (n: number) => new Date(Date.UTC(2026, 10, 9 + n));
const topic = (id: string, star: boolean, stage: number, next: Date | null): Topic => ({
  id, is_starred: star, review_stage: stage, next_review_at: next?.toISOString() ?? null,
});

test("afterReview: รอบ 1, 3, 7, 14 วัน แล้ววนที่ 14", () => {
  assert.equal(afterReview(0, day(0)).next_review_at, day(1).toISOString());
  assert.equal(afterReview(1, day(0)).next_review_at, day(3).toISOString());
  assert.equal(afterReview(3, day(0)).next_review_at, day(14).toISOString());
  assert.equal(afterReview(9, day(0)).next_review_at, day(14).toISOString());
  assert.equal(afterReview(2, day(0)).review_stage, 3);
});

test("nodeState + บอสฟื้นเลือดเมื่อเลยรอบทวน", () => {
  const topics = [
    topic("a", true, 1, day(3)), // ⭐ ทวนแล้ว ครบรอบวันที่ 3
    topic("b", false, 0, null), // ยังไม่ทวน
    topic("c", false, 2, day(10)),
  ];
  assert.equal(nodeState(topics[0], day(2)), "lit");
  assert.equal(nodeState(topics[0], day(4)), "fading");
  assert.equal(nodeState(topics[1], day(2)), "dark");

  const before = bossStatus(topics, day(2)); // เหลือแค่ b
  assert.deepEqual([before.hp, before.maxHp, before.ready], [1, 4, 75]);
  const after = bossStatus(topics, day(4)); // a เลยรอบ → บอสได้เลือดคืน 2
  assert.deepEqual([after.hp, after.ready], [3, 25]);
  assert.deepEqual(after.missing.map((t) => t.id), ["a", "b"]); // ⭐ มาก่อน
  assert.equal(bossStatus([]).ready, 0);
});

test("isMastered: ทวนครบ 4 รอบและยังไม่เลยรอบ", () => {
  assert.equal(isMastered(topic("m", false, 4, day(20)), day(10)), true);
  assert.equal(isMastered(topic("m", false, 4, day(20)), day(21)), false);
  assert.equal(isMastered(topic("m", false, 3, day(20)), day(10)), false);
});

test("ค่า XP ฝั่ง DB (xp_value ใน migration ขั้น 4) ตรงกับ XP_CONFIG", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync(new URL("../supabase/migrations/20261110090000_stage4_xp.sql", import.meta.url), "utf8");
  const db = Object.fromEntries([...sql.matchAll(/when '(\w+)' then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
  assert.deepEqual(db, { ...XP_CONFIG });
});

test("สูตรเลเวลแบบปิดของ xp_level() (SQL) ให้ผลเท่า levelFromXp", () => {
  const step = XP_CONFIG.levelStep;
  for (let xp = 0; xp <= 20000; xp++) {
    const lv = Math.floor((1 + Math.sqrt(1 + (8 * xp) / step)) / 2);
    assert.deepEqual({ level: lv, into: xp - (step * lv * (lv - 1)) / 2, need: step * lv }, levelFromXp(xp), `xp=${xp}`);
  }
});

test("examOf: ป้ายมาก่อน · ไม่มีป้ายดูวันที่จดเทียบวันสอบกลางภาค", () => {
  assert.equal(examOf("final", "2026-11-01", "2026-12-20"), "final");
  assert.equal(examOf(null, "2026-12-20", "2026-12-20"), "midterm");
  assert.equal(examOf(null, "2026-12-21", "2026-12-20"), "final");
  assert.equal(examOf(null, "2026-11-01", null), "final");
});

test("upcomingExams + daysUntil", () => {
  const ex = [
    { subject_id: "a", kind: "final" as const, date: "2027-03-01" },
    { subject_id: "b", kind: "midterm" as const, date: "2026-11-21" },
    { subject_id: "c", kind: "midterm" as const, date: "2026-11-01" },
  ];
  assert.deepEqual(upcomingExams(ex, "2026-11-09").map((e) => e.subject_id), ["b", "a"]);
  assert.equal(daysUntil("2026-11-21", "2026-11-09"), 12);
  assert.equal(daysUntil("2026-11-09", "2026-11-09"), 0);
});

test("nearExam + examReady", () => {
  const exams = [
    { subject_id: "a", kind: "midterm" as const, date: "2026-11-23" },
    { subject_id: "b", kind: "final" as const, date: "2026-11-24" },
  ];
  assert.equal(nearExam(exams, "2026-11-09")?.subject_id, "a"); // อีก 14 วันพอดี
  assert.equal(nearExam(exams, "2026-11-08"), undefined);
  const t = (id: string, stage: number, exam: "midterm" | "final" | null) => ({
    ...topic(id, false, stage, stage ? day(9) : null), subject_id: "a", exam, note_date: null,
  });
  assert.equal(examReady(exams[0], exams, [t("x", 1, "midterm"), t("y", 0, "midterm"), t("z", 0, "final")], day(0)), 50);
  assert.equal(examReady(exams[1], exams, [t("x", 1, "midterm")], day(0)), null);
});

test("reviewQueue: ไม่เอาที่ยังอยู่ในรอบ · ★ > สอบใกล้สุด > เลยรอบนานสุด > ยังไม่ทวน", () => {
  const t = (id: string, subject_id: string, star: boolean, stage: number, next: Date | null) => ({ ...topic(id, star, stage, next), subject_id });
  const topics = [
    t("lit", "near", true, 1, day(9)),
    t("noExam", "none", false, 1, day(-5)),
    t("never", "near", false, 0, null),
    t("late1", "near", false, 1, day(-1)),
    t("late3", "near", false, 1, day(-3)),
    t("farStar", "far", true, 0, null),
    t("nearStar", "near", true, 0, null),
  ];
  const exams = [
    { subject_id: "near", kind: "midterm" as const, date: "2026-11-18" },
    { subject_id: "far", kind: "midterm" as const, date: "2026-12-01" },
    { subject_id: "none", kind: "midterm" as const, date: "2026-11-01" }, // สอบผ่านไปแล้ว = ไม่นับ
  ];
  assert.deepEqual(reviewQueue(topics, exams, "2026-11-09", day(0)).map((x) => x.id),
    ["nearStar", "farStar", "late3", "late1", "never", "noExam"]);
  assert.equal(topics[0].id, "lit"); // ไม่แก้ลำดับข้อมูลต้นทาง
});

test("รอบทวนฝั่ง DB (review_topic ใน migration ขั้น 5) ตรงกับ REVIEW_DAYS", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync(new URL("../supabase/migrations/20261111090000_stage5_review.sql", import.meta.url), "utf8");
  const m = /array\[([\d, ]+)\]/.exec(sql);
  assert.deepEqual(m![1].split(",").map(Number), [...REVIEW_DAYS]);
});
