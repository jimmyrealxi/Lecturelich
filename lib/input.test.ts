/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { bangkokIso, isDate, normTime, normUrl } from "./input.ts";

test("isDate รับเฉพาะวันที่มีจริง", () => {
  assert.equal(isDate("2026-11-09"), true);
  assert.equal(isDate("2027-02-29"), false);
  assert.equal(isDate("2028-02-29"), true);
  assert.equal(isDate("9/11/2026"), false);
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
