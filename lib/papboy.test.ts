/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOOK, fullLook, ITEMS, SLOTS } from "./papboy.ts";

test("papboy: id ของไม่ซ้ำ · ทุกช่องมีของพื้นฐาน 1 ชิ้น", () => {
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
  for (const s of SLOTS) assert.equal(ITEMS.filter((i) => i.k === s.k && i.isDefault).length, 1);
  assert.equal(DEFAULT_LOOK.outfit, "hoodie");
});

test("papboy: fullLook เติมช่องที่ขาด และทิ้งค่าที่ไม่มีในคลัง", () => {
  const l = fullLook({ ears: "cat", hat: "crown", nope: "x" });
  assert.equal(l.ears, "cat");
  assert.equal(l.hat, "none");
  assert.equal(Object.keys(l).length, SLOTS.length);
  assert.deepEqual(fullLook(null), DEFAULT_LOOK);
});
