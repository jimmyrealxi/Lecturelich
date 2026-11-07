/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { dueInfo, dur, shortDate, thaiDate } from "./format.ts";

test("วันที่แบบไทย", () => {
  assert.equal(thaiDate("2026-11-07"), "เสาร์ 7 พ.ย.");
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
