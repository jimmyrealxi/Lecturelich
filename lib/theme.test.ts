/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { inkColor } from "./theme.ts";

test("สีวิชาชุดเก่าใน DB แมปเป็นโทนหมึก", () => {
  assert.equal(inkColor("#1F4E9C"), "#2B4A8A");
  assert.equal(inkColor("#2f7f8c"), "#1F6F78");
  assert.equal(inkColor("#6A3F8F"), "#6A3F8F"); // ชุดใหม่ผ่านเลย
  assert.equal(inkColor("#123456"), "#123456"); // ไม่รู้จัก = เดิม
});
