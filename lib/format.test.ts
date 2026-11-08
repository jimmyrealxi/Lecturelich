/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, dueInfo, dur, shortDate, thaiDate, typedDate, weekdayName } from "./format.ts";

test("countdown: นาที / ชม. / วัน", () => {
  assert.deepEqual(countdown(14), { n: "14", unit: "นาที" });
  assert.deepEqual(countdown(106), { n: "1:46", unit: "ชม." });
  assert.deepEqual(countdown(1439), { n: "23:59", unit: "ชม." });
  assert.deepEqual(countdown(2900), { n: "2", unit: "วัน" });
  assert.deepEqual(countdown(-3), { n: "0", unit: "นาที" });
});

test("วันที่แบบไทย", () => {
  assert.equal(thaiDate("2026-11-07"), "เสาร์ 7 พ.ย.");
  assert.equal(weekdayName("2026-11-07"), "วันเสาร์");
  assert.equal(typedDate("2026-11-07"), "07 พ.ย. 2569");
  assert.equal(shortDate("2026-11-10"), "อ. 10 พ.ย.");
});

test("ระยะเวลา h:mm", () => {
  assert.equal(dur(106), "1:46");
  assert.equal(dur(14), "0:14");
});

test("กำหนดส่งตามเวลาไทย", () => {
  // 23:59 ไทย 8 พ.ย. = 16:59Z
  assert.deepEqual(dueInfo("2026-11-08T16:59:00Z", "2026-11-07"), { day: "พรุ่งนี้", time: "23:59", days: 1 });
  assert.deepEqual(dueInfo("2026-11-07T17:30:00Z", "2026-11-07"), { day: "พรุ่งนี้", time: "00:30", days: 1 });
  assert.equal(dueInfo("2026-11-11T05:00:00Z", "2026-11-07").day, "พ. 11 พ.ย.");
  assert.equal(dueInfo("2026-11-06T05:00:00Z", "2026-11-07").day, "เลยกำหนด");
});
