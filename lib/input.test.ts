/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { bangkokIso, bangkokParts, fromThaiDate, isDate, maskDate, maskTime, normTime, normUrl, toThaiDate } from "./input.ts";

test("isDate รับเฉพาะวันที่มีจริง", () => {
  assert.equal(isDate("2026-11-09"), true);
  assert.equal(isDate("2027-02-29"), false);
  assert.equal(isDate("2028-02-29"), true);
  assert.equal(isDate("9/11/2026"), false);
});

test("maskDate: พิมพ์แค่เลขแล้วขึ้น / เอง · ลบถอยหลังไม่ติด", () => {
  assert.equal(maskDate("08112569"), "08/11/2569");
  assert.equal(maskDate("8112569"), "8/11/2569"); // ขึ้นต้น 8 = วันที่หลักเดียว
  assert.equal(maskDate("0811"), "08/11");
  assert.equal(maskDate("08/"), "08"); // ลบเลขตัวถัดไปแล้ว / ต้องหายด้วย
  assert.equal(maskDate("08/1"), "08/1");
  assert.equal(maskDate("1/1/2569"), "1/1/2569");
  assert.equal(maskDate("081125691"), "08/11/2569"); // เกินไม่รับ
  assert.equal(maskDate("a8"), "8");
});

test("maskTime: พิมพ์แค่เลขแล้วขึ้น : เอง", () => {
  assert.equal(maskTime("1300"), "13:00");
  assert.equal(maskTime("900"), "9:00");
  assert.equal(maskTime("13:"), "13");
  assert.equal(maskTime("1:30"), "1:30");
  assert.equal(maskTime("130059"), "13:00");
});

test("fromThaiDate / toThaiDate: พ.ศ. ↔ ISO", () => {
  assert.equal(fromThaiDate("8/11/2569"), "2026-11-08");
  assert.equal(fromThaiDate("08/11/2569"), "2026-11-08");
  assert.equal(fromThaiDate("29/2/2570"), null); // 2027 ไม่อธิกสุรทิน
  assert.equal(fromThaiDate("29/2/2571"), "2028-02-29");
  assert.equal(fromThaiDate("8/11/2026"), null); // ใส่ ค.ศ. = ผิด
  assert.equal(fromThaiDate("8/11"), null);
  assert.equal(toThaiDate("2026-11-08"), "8/11/2569");
  assert.equal(fromThaiDate(toThaiDate("2027-03-07")), "2027-03-07");
});

test("normTime", () => {
  assert.equal(normTime("9:05"), "09:05");
  assert.equal(normTime("13.30"), "13:30");
  assert.equal(normTime("24:00"), null);
  assert.equal(normTime("10:60"), null);
  assert.equal(normTime("abc"), null);
});

test("normUrl: เติม https และไม่รับ scheme อันตราย", () => {
  assert.equal(normUrl(""), null);
  assert.equal(normUrl("classroom.google.com/c/abc"), "https://classroom.google.com/c/abc");
  assert.equal(normUrl("https://line.me/R/ti/g/x"), "https://line.me/R/ti/g/x");
  assert.equal(normUrl("javascript:alert(1)"), undefined);
});

test("bangkokIso: 23:59 ไทย = 16:59 UTC", () => {
  assert.equal(bangkokIso("2026-11-12", "23:59"), "2026-11-12T16:59:00.000Z");
});

test("bangkokParts: กลับด้าน bangkokIso (ข้ามวันตอนตี 1 ไทย)", () => {
  assert.deepEqual(bangkokParts(bangkokIso("2026-11-12", "23:59")), { date: "2026-11-12", time: "23:59" });
  assert.deepEqual(bangkokParts("2026-11-12T18:30:00.000Z"), { date: "2026-11-13", time: "01:30" });
});
