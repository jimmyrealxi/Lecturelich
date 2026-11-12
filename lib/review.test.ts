/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeClassName } from "./review.ts";

test("looksLikeClassName: ชื่อคาบ/สัปดาห์/ชื่อวิชาเฉย ๆ = เตือน · เรื่องที่เรียน = ไม่เตือน", () => {
  for (const t of ["Blockchain week1", "week 3", "Lec 2", "บทที่ 4", "สัปดาห์ที่ 2", "คาบแรก", "ครั้งที่ 5", "บท 1"]) {
    assert.equal(looksLikeClassName(t), true, t);
  }
  assert.equal(looksLikeClassName("เทคโนโลยีบล็อกเชน", "เทคโนโลยีบล็อกเชน"), true);
  assert.equal(looksLikeClassName("เทคโนโลยีบล็อกเชน 2", "เทคโนโลยีบล็อกเชน"), true);
  for (const t of ["Proof of Work คืออะไร", "hash กับ nonce", "degree ของ graph", "Weekly report format"]) {
    assert.equal(looksLikeClassName(t, "เทคโนโลยีบล็อกเชน"), false, t);
  }
});
