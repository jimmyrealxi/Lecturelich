import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { CLASSES } from "./classes.ts";

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
