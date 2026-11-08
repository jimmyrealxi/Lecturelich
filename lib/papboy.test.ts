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

test("papboy: LOOT_CONFIG + คลังของ ตรงกับ migration ขั้น 7 / 7b", async () => {
  const { readFileSync } = await import("node:fs");
  const { LOOT_CONFIG } = await import("./papboy.ts");
  const sql = readFileSync(new URL("../supabase/migrations/20261113090000_stage7_loot.sql", import.meta.url), "utf8");
  // loot_value() ล่าสุดอยู่ใน 7b (ทับทั้งชุด)
  const sqlB = readFileSync(new URL("../supabase/migrations/20261114090000_stage7b_boxes.sql", import.meta.url), "utf8");
  const db = Object.fromEntries([...sqlB.matchAll(/when '(\w+)' then (\d+)/g)].map((m) => [m[1], Number(m[2])]));
  assert.deepEqual(db, { ...LOOT_CONFIG });
  const rows = [...sql.matchAll(/\('([\w.]+)', '(\w+)', '([^']+)', '([nmru])', (true|false)\)/g)].map((m) => m.slice(1).join("|"));
  assert.deepEqual(rows, ITEMS.map((i) => [i.id, i.k, i.name, i.r, i.isDefault].join("|")));
});
