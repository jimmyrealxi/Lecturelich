/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TITLES } from "./titles.ts";

test("titles: id + need ตรงกับ migration 7c", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261115090000_stage7c_titles.sql", import.meta.url), "utf8");
  const db = [...sql.matchAll(/\('(\w+)', \w+, (\d+)\)/g)].map((m) => [m[1], Number(m[2])]);
  assert.deepEqual(db, TITLES.map((t) => [t.id, t.need]));
});
