import { test } from "node:test";
import assert from "node:assert/strict";
import { LINES, pickLine, type EmptyKind } from "./emptyLines.ts";

test("สุ่มได้คำในรายการเสมอ แม้ค่าสุ่มอยู่สุดขอบ", () => {
  for (const kind of Object.keys(LINES) as EmptyKind[]) {
    for (const r of [0, 0.5, 0.999999]) {
      const list: readonly string[] = LINES[kind];
      assert.ok(list.includes(pickLine(kind, () => r)), `${kind} ${r}`);
    }
  }
});
