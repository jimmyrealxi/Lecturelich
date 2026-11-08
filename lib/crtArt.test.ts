/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { CRT_SCENES, drawScene, pickScene, scenePool, SLOW, type CrtKind } from "./crtArt.ts";

test("ทุกภาพวาดได้ครบเฟรม ไม่พัง และมีของบนจอ", () => {
  let drawn = 0;
  const g = new Proxy({}, {
    get: (_t, k) => (k === "fillRect" ? () => { drawn++; } : () => {}),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  for (const kind of Object.keys(CRT_SCENES) as CrtKind[]) {
    assert.equal(CRT_SCENES[kind].length, 5, kind);
    for (const scene of CRT_SCENES[kind]) {
      for (const [W, H] of [[110, 44], [96, 60]]) {
        drawn = 0;
        for (let t = 0; t <= 1; t += 0.02) drawScene(g, W, H, t, scene);
        assert.ok(drawn > 0, scene.label);
      }
      const sec = (scene.ms * SLOW) / 1000;
      assert.ok(sec >= 1.8 && sec <= 2.6, `${scene.label} ${sec}`);
    }
  }
});

test("pickScene: ไม่ซ้ำแบบล่าสุด · ครั้งแรกสุ่มได้ทุกแบบ", () => {
  for (let last = 0; last < 5; last++) {
    for (let r = 0; r < 1; r += 0.01) {
      const i = pickScene(5, last, r);
      assert.ok(i >= 0 && i < 5 && i !== last, `${last} ${r} → ${i}`);
    }
  }
  assert.equal(pickScene(5, -1, 0.99), 4);
  assert.equal(pickScene(1, 0, 0.5), 0);
});

test("ทันนาทีสุดท้าย ขึ้นเฉพาะตอนใกล้หมดเวลา", () => {
  assert.equal(scenePool("submit").length, 4);
  assert.equal(scenePool("submit", true).length, 5);
  assert.equal(scenePool("present").length, 5);
});
