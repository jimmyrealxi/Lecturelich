import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { CLASSES, fitsClass, weaponClass } from "./classes.ts";
import { ITEMS } from "./papboy.ts";

const dir = new URL("../supabase/migrations/", import.meta.url);
const sql = readdirSync(dir).sort().map((n) => readFileSync(new URL(n, dir), "utf8")).filter((s) => s.includes("function public.class_ascs")).pop()!;
const art = readFileSync(new URL("./papboy.ts", import.meta.url), "utf8");

test("คลาสและสายย่อยตรงกันทั้ง lib/classes.ts, migration และภาพ", () => {
  for (const k of CLASSES) {
    const pair = k.asc.map((a) => `'${a.id}'`).join(", ");
    assert.ok(sql.includes(`when '${k.id}' then array[${pair}]`), `SQL ขาด ${k.id}`);
    for (const id of [k.id, ...k.asc.map((a) => a.id)]) assert.match(art, new RegExp(`^  ${id}: \\{`, "m"), `ภาพขาด ${id}`);
  }
});

test("อาวุธ: คลาสละ 5 ชิ้น (ปกติ 2 magic 1 rare 1 unique 1) ตรงกับ migration และมีภาพกับกระสุน", () => {
  const weapons = readdirSync(dir).sort().map((n) => readFileSync(new URL(n, dir), "utf8")).filter((s) => s.includes("class_id text")).pop()!;
  const fx = readFileSync(new URL("../components/game/bossFx.ts", import.meta.url), "utf8");
  for (const k of CLASSES) {
    const rar = k.weapons.map((w) => ITEMS.find((i) => i.id === `held.${w}`)?.r);
    assert.deepEqual([...rar].sort(), ["m", "n", "n", "r", "u"], k.id);
    for (const w of k.weapons) {
      assert.equal(weaponClass(w), k.id);
      assert.match(weapons, new RegExp(`\\('held\\.${w}', .*'${k.id}'\\)`), `SQL ขาด ${w}`);
      assert.ok(fx.includes(`case "${w}":`), `กระสุนขาด ${w}`);
      assert.ok(w === "pencil" || w === "laser" || art.includes(`case "${w}":`), `ภาพขาด ${w}`);
    }
  }
});

test("fitsClass: อาวุธใช้ได้เฉพาะคลาสตัวเอง ของอื่นและมือเปล่าใช้ได้หมด", () => {
  assert.equal(fitsClass({ k: "held", v: "alarm", isDefault: false }, "deadline"), true);
  assert.equal(fitsClass({ k: "held", v: "alarm", isDefault: false }, "scribe"), false);
  assert.equal(fitsClass({ k: "held", v: "alarm", isDefault: false }, null), false);
  assert.equal(fitsClass({ k: "held", v: "none", isDefault: true }, null), true);
  assert.equal(fitsClass({ k: "hat", v: "grad", isDefault: false }, null), true);
});
