// ภาพจอเขียวตอนกดปุ่ม ปุ่มละ 5 แบบ (ย้ายจาก docs/mockups/a-crt-variants.html ที่เจ้าของเลือก) · วาดเองทั้งหมดบนกริดพิกเซล สีเดียวแบบฟอสเฟอร์ · ไม่ผูกกับ UI

type G = CanvasRenderingContext2D;
export type Scene = { ms: number; label: string; lastMinute?: boolean; f: (g: G, W: number, H: number, t: number) => void };
export type CrtKind = "present" | "absent" | "no_class" | "submit";

export const CELL = 3; // 1 ช่องกริด = 3px จอ
export const SLOW = 1.7; // คูณเวลาทุกภาพ ปรับความช้าที่นี่ที่เดียว
export const REVEAL = 0.45; // ป้ายขึ้นเมื่อภาพเล่นถึงจุดนี้
const FADE = 0.88;

const ON = "#9EF0B4", DIM = "#2F6B42", HI = "#B8FFC9", BLACK = "#08130C";
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const out = (p: number) => 1 - Math.pow(1 - p, 3);
const rect = (g: G, x: number, y: number, w: number, h: number, c = ON) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const px = (g: G, x: number, y: number, c = ON) => rect(g, x, y, 1, 1, c);
const frame = (g: G, x: number, y: number, w: number, h: number, c = ON) => { rect(g, x, y, w, 1, c); rect(g, x, y + h - 1, w, 1, c); rect(g, x, y, 1, h, c); rect(g, x + w - 1, y, 1, h, c); };
const line = (g: G, x0: number, y0: number, x1: number, y1: number, c = ON, th = 1) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) rect(g, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, th, th, c); };
const disc = (cx: number, cy: number, r: number, fn: (x: number, y: number) => void) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) fn(x, y); };
const sp = (g: G, rows: string[], x: number, y: number, s = 2, c = ON) => rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === "#") rect(g, x + i * s, y + j * s, s, s, c); }));

const STAND = ["..###..", "..###..", "..###..", "...#...", ".#####.", "...#...", "...#...", "..#.#..", "..#.#..", ".#...#."];
const WAVE = ["..###.#", "..###.#", "..###.#", "...#.#.", ".####..", "...#...", "...#...", "..#.#..", "..#.#..", ".#...#."];
const RUN1 = ["...###.", "...###.", "...###.", "....#..", ".####.#", "#..#...", "...##..", "..#..#.", ".#....#", "#......"];
const RUN2 = ["...###.", "...###.", "...###.", "....#..", "#.###..", "...#.#.", "...#...", "...#...", "..##...", "..#...."];
const BOW = [".......", ".###...", ".###...", ".###.#.", "..#.##.", "..###..", "...#...", "..#.#..", "..#.#..", ".#...#."];
const Z = ["####", "..#.", ".#..", "####"];
const RIP = ["###..#.###", "#..#.#.#.#", "###..#.###", "#.#..#.#..", "#..#.#.#.."];
const GHOST = [".###.", "#####", "#.#.#", "#####", "#####", "#.#.#"];
const PAPER = ["#######", "#.....#", "#.###.#", "#.....#", "#.###.#", "#.....#", "#######"];
const BANG = ["#", "#", "#", ".", "#"];
const HEART = [".#.#.", "#####", "#####", ".###.", "..#.."], BOLT = ["..##", ".##.", "####", ".##.", "##..", "#..."], HOUSE = ["..#..", ".###.", "#####", ".#.#.", ".###."];
const MAN_H = 20; // STAND สูง 10 ช่อง × s=2

const zFloat = (g: G, x: number, y: number, t: number, n = 3) => { for (let i = 0; i < n; i++) { const p = clamp((t - .12 * i) / .65); if (p <= 0 || p >= 1) continue; sp(g, Z, x + i * 7, y - p * 22 - i * 2, i + 1, HI); } };
const dust = (g: G, x: number, y: number, t: number) => { for (let i = 0; i < 9; i++) { const a = hash(i, 7) * 3.14, r = t * (8 + hash(i, 8) * 12); if (hash(i, 9) > t * .9) px(g, x + Math.cos(a) * r, y - Math.sin(a) * r * .6, DIM); } };
const ground = (g: G, W: number, H: number) => rect(g, 0, H - 3, W, 1, DIM);

const PRESENT_BASE: Scene[] = [
  { ms: 1200, label: "มาแล้วจ้า", f(g, W, H, t) { ground(g, W, H); const y = H - 3 - MAN_H * out(clamp(t / .35)); sp(g, Math.floor(t * 10) % 2 ? WAVE : STAND, W / 2 - 7, y); rect(g, 0, H - 3, W, 3, BLACK); if (t > .4 && t < .95) sp(g, BANG, W / 2 + 12, H - 3 - MAN_H - 3, 2, HI); } },
  { ms: 1200, label: "ทันเฉียดฉิว", f(g, W, H, t) { ground(g, W, H); const p = clamp(t / .55), x = -16 + (W / 2 + 8) * out(p); sp(g, p < 1 ? (Math.floor(t * 22) % 2 ? RUN1 : RUN2) : STAND, x, H - 3 - MAN_H); if (p < 1) for (let i = 0; i < 4; i++) rect(g, x - 8 - hash(i, Math.floor(t * 30)) * 12, H - 20 + i * 5, 8, 1, DIM); else dust(g, x + 7, H - 3, clamp((t - .55) / .3)); } },
  { ms: 1100, label: "คราวนี้มาจริง", f(g, W, H, t) { const p = clamp(t / .22), sz = Math.floor((1 - out(p)) * 60 + 32), cx = W / 2 + (p >= 1 && t < .34 ? (hash(1, Math.floor(t * 50)) - .5) * 3 : 0), cy = H / 2, x = cx - sz / 2, y = cy - sz / 2; for (let i = 0; i < 2; i++) frame(g, x + i, y + i, sz - 2 * i, sz - 2 * i, HI); line(g, cx - sz * .26, cy + sz * .02, cx - sz * .06, cy + sz * .24, ON, 2); line(g, cx - sz * .06, cy + sz * .24, cx + sz * .3, cy - sz * .22, ON, 2); if (p >= 1) dust(g, cx, cy + sz / 2, clamp((t - .22) / .4)); } },
  { ms: 1300, label: "ตาค้างแต่มา", f(g, W, H, t) { const cx = W / 2 - 12, y = H - 22; frame(g, cx, y, 22, 20, ON); rect(g, cx + 22, y + 5, 6, 1, ON); rect(g, cx + 22, y + 13, 6, 1, ON); rect(g, cx + 27, y + 5, 1, 9, ON); const fill = 18 * out(clamp(t / .5)); rect(g, cx + 1, y + 19 - fill, 20, fill, DIM); if (t > .3) for (let s = 0; s < 3; s++) for (let k = 0; k < 10; k++) px(g, cx + 5 + s * 6 + Math.sin(k * .7 + t * 14 + s) * 2, y - 2 - k * 2 * clamp((t - .3) / .4), k > 6 ? DIM : ON); } },
  { ms: 1400, label: "มาแล้ว ใจยังอยู่บ้าน", f(g, W, H, t) { ground(g, W, H); const cx = W / 2 - 10, nod = Math.floor(t * 5) % 2 ? 3 : 0; rect(g, cx - 3, H - 26 + nod, 8, 8, ON); rect(g, cx - 1, H - 17, 4, 14, ON); line(g, cx + 2, H - 14, cx + 12, H - 12, ON, 2); rect(g, cx + 8, H - 11, 28, 2, ON); rect(g, cx + 10, H - 9, 2, 6, DIM); rect(g, cx + 32, H - 9, 2, 6, DIM); zFloat(g, cx + 7, H - 26, t); } },
];

// มาเรียน: แต่ละแบบมีมุกของตัวเอง
const EXTRA: Scene["f"][] = [
  (g, W, H, t) => { ([[-32, .3], [20, .42]] as const).forEach(([dx, d]) => { const p = out(clamp((t - d) / .25)); if (p > 0) sp(g, Math.floor(t * 14) % 2 ? WAVE : STAND, W / 2 + dx, H - 3 - 20 * p, 2, ON); }); rect(g, 0, H - 3, W, 3, BLACK); rect(g, 0, H - 3, W, 1, DIM); },
  (g, W, H, t) => { const p = clamp(t / .55); if (p < 1) for (let i = 1; i <= 3; i++) { const x = -16 + (W / 2 + 8) * out(clamp(p - i * .06)); sp(g, RUN2, x, H - 23, 2, DIM); } else if (t < .9) sp(g, BANG, W / 2 + 22, H - 30 - Math.abs(Math.sin(t * 24)) * 4, 2, HI); },
  (g, W, H, t) => { if (t < .22) return; const q = out(clamp((t - .22) / .35)); for (let i = 0; i < 18; i++) { const a = hash(i, 21) * 6.283, r = (24 + hash(i, 22) * 14) * q; rect(g, W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * .7, 2, 2, i % 2 ? HI : DIM); } },
  (g, W, H, t) => { const cx = W / 2 - 12, y = H - 22; if (t > .35) for (let i = 0; i < 14; i++) { const p = clamp((t - .35 - hash(i, 31) * .25) / .5), a = -2.6 + hash(i, 32) * 2; if (p > 0 && p < 1) rect(g, cx + 11 + Math.cos(a) * p * 30, y + Math.sin(a) * p * 30 + p * p * 24, 2, 2, ON); } if (t > .5) { const big = Math.floor(t * 10) % 2; [-8, 8].forEach((d) => { frame(g, W / 2 + 24 + d - 3, y - 2, 8, 8, HI); rect(g, W / 2 + 24 + d - (big ? 1 : 0), y + 1 - (big ? 1 : 0), big ? 3 : 2, big ? 3 : 2, HI); }); } },
  (g, W, H, t) => { if (t < .52) return; const cx = W / 2 - 6, cy = H - 26; sp(g, ["##", "##", "##", "##", "..", "##"], cx - 1, cy - 20 - Math.abs(Math.sin(t * 22)) * 3, 2, HI); const q = clamp((t - .52) / .3); for (let i = 0; i < 8; i++) { const a = -3.14 + i / 7 * 3.14; line(g, cx + Math.cos(a) * (10 + q * 4), cy + Math.sin(a) * (10 + q * 4), cx + Math.cos(a) * (15 + q * 7), cy + Math.sin(a) * (15 + q * 7), ON); } },
];
// ฉากหลังสีจาง: แบบแรก = ในห้องเรียน · แบบสอง = ทางเดินตึกที่เลื่อนผ่านตอนวิ่ง
const BG: Scene["f"][] = [
  (g, W, H) => { const bx = W / 2 - 40; frame(g, bx, 3, 80, 22, DIM); for (let r = 0; r < 3; r++) for (let x = 0; x < (r === 2 ? 34 : 60 - r * 12); x += 2) if (hash(x, r + 40) > .3) px(g, bx + 6 + x, 8 + r * 6 + Math.floor(hash(x, r + 41) * 2), DIM); rect(g, bx + 56, 25, 14, 1, DIM); frame(g, 5, 6, 15, 19, DIM); rect(g, 12, 6, 1, 19, DIM); rect(g, 5, 15, 15, 1, DIM); frame(g, W - 19, 9, 14, H - 12, DIM); rect(g, W - 9, H / 2, 2, 2, DIM); },
  (g, W, H, t) => { const p = clamp(t / .55), off = out(p) * 72; rect(g, 0, 5, W, 1, DIM); for (let i = 0; i < 9; i++) { const x = i * 22 - off % 22 - 4; frame(g, x, 9, 16, H - 13, DIM); rect(g, x + 12, H / 2, 2, 3, DIM); } const dx = W + 8 - out(p) * (W / 2 - 6); rect(g, dx - 2, 6, 26, H - 10, BLACK); frame(g, dx, 8, 20, H - 11, ON); frame(g, dx + 2, 10, 16, 10, DIM); rect(g, dx + 15, H / 2 + 4, 2, 2, HI); const cx = 26, cy = 13, r = 7; disc(cx, cy, r, (x, y) => { if ((x - cx) ** 2 + (y - cy) ** 2 >= (r - 1) ** 2) px(g, x, y, ON); }); const a = p < 1 ? t * 40 : -1.57; line(g, cx, cy, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, HI); },
];
// เอฟเฟกต์หน้าสุด: แบบแรก = มือโบก + ผงชอล์ก · แบบสอง = เส้นความเร็ว
const FRONT: Scene["f"][] = [
  (g, W, H, t) => { if (t > .2 && Math.floor(t * 10) % 2) [0, 1].forEach((i) => { const cx = W / 2 + 10, cy = H - 22, r = 5 + i * 4; for (let a = -1.1; a < .5; a += .25) px(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, HI); }); for (let i = 0; i < 10; i++) { const q = (t * (.6 + hash(i, 51) * .6) + hash(i, 52)) % 1; if (hash(i, 53) > .35) px(g, W / 2 - 38 + hash(i, 54) * 76, 5 + q * 30, q > .6 ? DIM : ON); } },
  (g, W, H, t) => { if (t < .55) for (let i = 0; i < 8; i++) { const y = 12 + i * (H - 18) / 8, L = 14 + hash(i, Math.floor(t * 30)) * 30, x = hash(i + 1, Math.floor(t * 30)) * W; rect(g, x, y, L, 1, i % 3 ? DIM : ON); } else if (t < .68) { const q = (t - .55) / .13; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; rect(g, W / 2 + 14 + Math.cos(a) * q * 14, H / 2 + Math.sin(a) * q * 10, 2, 1, HI); } } },
];
const MORE: Scene["f"][] = [
  (g, W, H, t) => { ([[-10, .52], [8, .66]] as const).forEach(([dx, d]) => { const p = clamp((t - d) / .34); if (p > 0 && p < 1) sp(g, HEART, W / 2 + dx, H - 28 - p * 16, 1, p > .7 ? DIM : HI); }); },
  (g, W, H, t) => { if (t < .55) return; const q = clamp((t - .55) / .3), hx = W / 2 + 15, hy = H - 23; for (let x = 0; x < 28; x += 4) rect(g, W / 2 - 20 + x, H - 2, 2, 1, DIM); ([[-1, -1], [1, -1.3], [1.4, -.5]] as const).forEach(([a, b]) => { if (q < 1) rect(g, hx + a * q * 12, hy + b * q * 10 + q * q * 8, 2, 2, HI); }); },
  (g, W, H, t) => { if (t < .3) return; const q = clamp((t - .3) / .55); [-11, -3, 6, 12].forEach((d, i) => rect(g, W / 2 + d, H / 2 + 16, 2, (4 + i % 3 * 4) * q, i % 2 ? ON : DIM)); },
  (g, W, H, t) => { if (t > .55 && Math.floor(t * 9) % 2) sp(g, BOLT, W / 2 - 10, H - 44, 2, HI); },
  (g, W, H, t) => { if (t < .62) return; const cx = W / 2 + 18, y = 5; ([[-14, 24], [-9, 20]] as const).forEach(([dx, dy]) => rect(g, cx + dx, y + dy, 2, 2, DIM)); frame(g, cx - 6, y, 24, 16, ON); sp(g, HOUSE, cx + 1, y + 3, 2, HI); },
];

const PRESENT: Scene[] = PRESENT_BASE.map((v, i) => ({
  ...v,
  f(g, W, H, t) {
    g.save();
    if (i === 2 && t >= .22 && t < .32) { const k = (.32 - t) * 40; g.translate((hash(1, Math.floor(t * 90)) - .5) * k, (hash(2, Math.floor(t * 90)) - .5) * k); }
    BG[i]?.(g, W, H, t);
    v.f(g, W, H, t);
    EXTRA[i](g, W, H, t);
    MORE[i](g, W, H, t);
    FRONT[i]?.(g, W, H, t);
    g.restore();
  },
}));

const ABSENT: Scene[] = [
  { ms: 1400, label: "RIP คะแนนเข้าเรียน", f(g, W, H, t) { ground(g, W, H); const p = out(clamp(t / .32)), h = 28 * p, x = W / 2 - 14, y = H - 3 - h; rect(g, x, y, 28, h, DIM); frame(g, x, y, 28, h, ON); if (p > .85) sp(g, RIP, x + 4, y + 7, 1, HI); if (t > .4) { const q = clamp((t - .4) / .6); sp(g, GHOST, W / 2 + 22 + Math.sin(q * 9) * 2, H - 20 - q * 22, 2, q > .8 ? DIM : ON); } } },
  { ms: 1400, label: "ขออีก 5 นาที", f(g, W, H, t) { const shake = t < .32 ? (hash(2, Math.floor(t * 40)) - .5) * 2 : 0, bx = W / 2 - 26 + shake, by = H - 22; rect(g, bx, by + 10, 52, 3, ON); rect(g, bx, by + 13, 2, 6, ON); rect(g, bx + 50, by + 13, 2, 6, ON); rect(g, bx + 2, by + 2, 10, 8, HI); disc(bx + 30, by + 10, 10, (x, y) => { if (y <= by + 10) px(g, x, y, ON); }); if (t < .32) for (let i = 0; i < 3; i++) sp(g, BANG, bx - 14 + i * 5, by - 8 + (i % 2) * 3, 1, HI); else zFloat(g, bx + 18, by - 2, clamp((t - .32) / .68)); } },
  { ms: 1300, label: "หนีเรียนสำเร็จ", f(g, W, H, t) { ground(g, W, H); frame(g, 6, H - 36, 26, 33, ON); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rect(g, 10 + i * 7, H - 32 + j * 9, 3, 4, DIM); const x = 30 + out(clamp(t / .8)) * (W + 20); sp(g, Math.floor(t * 22) % 2 ? RUN1 : RUN2, x, H - 3 - MAN_H); for (let i = 0; i < 4; i++) px(g, x - 5 - i * 5, H - 4 - hash(i, Math.floor(t * 20)) * 3, DIM); } },
  { ms: 1400, label: "ฝนตกเลยไม่ไป", f(g, W, H, t) { ground(g, W, H); const cx = W / 2; for (let i = 0; i < 46; i++) { const x = hash(i, 6) * W, y = ((hash(i, 7) + t * 2.4) % 1) * (H - 4); if (Math.abs(x - cx) < 15 && y > H - 40) continue; rect(g, x, y, 1, 3, DIM); } disc(cx, H - 26, 15, (x, y) => { if (y <= H - 26) px(g, x, y, ON); }); rect(g, cx, H - 26, 1, 6, ON); sp(g, STAND, cx - 7, H - 23); } },
  { ms: 1400, label: "อีกคลิปเดียว", f(g, W, H, t) { const x = W / 2 - 13, y = 4, h = H - 8; frame(g, x, y, 26, h, ON); frame(g, x + 1, y + 1, 24, h - 2, DIM); const off = (t * 80) % 10; for (let i = -1; i < Math.floor(h / 10) + 1; i++) { const ly = y + 5 + i * 10 - off; if (ly > y + 2 && ly < y + h - 6) { rect(g, x + 5, ly, 16, 3, i % 2 ? ON : HI); rect(g, x + 5, ly + 4, 10, 1, DIM); } } sp(g, ["#####", "#####", ".###."], x + 21, y + h * .55 + Math.sin(t * 22) * 4, 2, HI); } },
];

const NO_CLASS: Scene[] = [
  { ms: 1400, label: "อาจารย์งด เย้!", f(g, W, H, t) { ground(g, W, H); const b = Math.abs(Math.sin(t * 16)) * 6; sp(g, Math.floor(t * 12) % 2 ? WAVE : STAND, W / 2 - 7, H - 3 - MAN_H - b); for (let i = 0; i < 42; i++) { const x = hash(i, 3) * W, sp2 = .5 + hash(i, 4), y = ((t * sp2 * 1.6 + hash(i, 5)) % 1) * (H - 4); rect(g, x, y, 2, 1, i % 3 ? ON : HI); } } },
  { ms: 1500, label: "ไปหมูกระทะกัน", f(g, W, H, t) { const cx = W / 2, cy = H - 16, r = 20; disc(cx, cy, r, (x, y) => { if (y <= cy && (x - cx) ** 2 + (y - cy) ** 2 >= (r - 2) ** 2) px(g, x, y, ON); }); rect(g, cx - r - 4, cy, 2 * r + 8, 2, ON); rect(g, cx - r + 3, cy + 2, 2 * r - 6, 7, DIM); frame(g, cx - r + 3, cy + 2, 2 * r - 6, 7, ON); for (let i = 0; i < 7; i++) { const a = (i + .5) / 7 * 3.14, rr = r * .55; if (hash(i, Math.floor(t * 14)) > .28) rect(g, cx + Math.cos(a) * rr - 2, cy - Math.sin(a) * rr, 4, 2, HI); } for (let s = 0; s < 3; s++) { const x0 = cx - 12 + s * 12; for (let k = 0; k < 16; k++) { const q = k / 16, y = cy - r - 2 - q * (H - r - 14) * clamp(t / .4); if (y > 0) px(g, x0 + Math.sin(q * 6 + t * 16 + s) * 3, y, q > .7 ? DIM : ON); } } } },
  { ms: 1200, label: "นอนยาวไป", f(g, W, H, t) { const mx = W / 2 - 6, my = H * .55, r = Math.min(H * .3, 14) * out(clamp(t / .3)); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r && (x - r * .5) ** 2 + (y + r * .2) ** 2 > r * r * .8) px(g, mx + x, my + y, ON); for (let i = 0; i < 14; i++) if (hash(i, Math.floor(t * 6) + 1) > .4) px(g, hash(i, 1) * W, hash(i, 2) * H * .8, DIM); zFloat(g, mx + r + 4, my, clamp((t - .2) / .8)); } },
  { ms: 1400, label: "ซีรีส์ยาวไป", f(g, W, H, t) { const x = W / 2 - 24, y = 6, w = 48, h = 30; frame(g, x, y, w, h, ON); rect(g, x + 18, y + h, 12, 2, ON); rect(g, x + 12, y + h + 2, 24, 1, ON); for (let i = 0; i < w - 6; i++) { const a = Math.sin(i * .4 + t * 18) * Math.sin(i * .09 + t * 5) * 8; px(g, x + 3 + i, y + h / 2 + a, HI); } for (let i = 0; i < 10; i++) if (hash(i, Math.floor(t * 10)) > .35) px(g, x + w + 4 + hash(i, 1) * 14, H - 4 - hash(i, 2) * 9, ON); } },
  { ms: 1500, label: "ห้องเรียนร้าง", f(g, W, H, t) { ground(g, W, H); const x = -12 + t * (W + 24), y = H - 11 - Math.abs(Math.sin(t * 16)) * 7, r = 8, rot = Math.floor(t * 12); disc(x, y, r, (a, b) => { if (hash(a - Math.floor(x) + rot, b - Math.floor(y)) > .55) px(g, a, b, ON); }); for (let i = 0; i < 3; i++) rect(g, x - r - 5 - i * 4, H - 6 - i * 2, 4, 1, DIM); } },
];

const DICE_P = [[-8, -8], [8, -8], [-8, 0], [8, 0], [-8, 8], [8, 8], [0, 0]];
const DICE_L: Record<number, number[]> = { 1: [6], 2: [0, 5], 3: [0, 6, 5], 4: [0, 1, 4, 5], 5: [0, 1, 4, 5, 6], 6: [0, 1, 2, 3, 4, 5] };

const SUBMIT: Scene[] = [
  { ms: 1500, label: "ส่งแล้ว!", f(g, W, H, t) { const cx = Math.floor(W * .5), gr = H - 3; if (t < .07) { g.globalAlpha = .55 * (1 - t / .07); rect(g, 0, 0, W, H, HI); g.globalAlpha = 1; } const p = out(clamp((t - .05) / .45)), top = gr - p * H * .62, r = 3 + p * Math.min(H * .3, W * .2), tick = Math.floor(t * 12); for (let y = Math.floor(top); y < gr; y++) { const hw = 2 + Math.floor(hash(y, tick) * 2) + (gr - y < 5 ? 5 - (gr - y) : 0); for (let x = -hw; x <= hw; x++) px(g, cx + x, y, hash(x, y) > .82 ? DIM : ON); } const cap = (x: number, y: number) => { const n = hash(x, y + tick); if (n < .1) return; const rel = (y - top) / r; px(g, x, y, rel > .25 && n < .35 ? DIM : rel < -.5 ? HI : ON); }; disc(cx - r * .62, top, r * .68, cap); disc(cx + r * .62, top, r * .68, cap); disc(cx, top - r * .4, r * .78, cap); const dw = p * W * .44; for (let x = -dw; x <= dw; x++) px(g, cx + x, gr, ON); if (t < .75) { const q = clamp(t / .75); for (let a = 0; a < 70; a++) { const an = a / 70 * 3.1416; px(g, cx + Math.cos(an) * q * W * .62, gr - Math.sin(an) * q * 5, HI); } } } },
  { ms: 1300, label: "ปล่อยแล้ว บุญรักษา", f(g, W, H, t) { for (let i = 0; i < 30; i++) { const x = hash(i, 1) * W, y = ((hash(i, 2) + t * (t > .2 ? 1.6 : 0)) % 1) * H; rect(g, x, y, 1, t > .2 ? 4 : 1, DIM); } const p = clamp((t - .2) / .7), y = H - 14 - (p * p) * (H + 18), x = W / 2 - 7 + (t < .2 ? (hash(1, Math.floor(t * 40)) - .5) * 2 : 0); sp(g, PAPER, x, y, 2, ON); line(g, x, y + 14, x - 6, y + 22, ON, 2); line(g, x + 13, y + 14, x + 19, y + 22, ON, 2); for (let i = 0; i < 10; i++) rect(g, x + 3 + hash(i, Math.floor(t * 30)) * 8, y + 15 + hash(i + 3, Math.floor(t * 30)) * 12, 2, 2, i % 2 ? HI : ON); } },
  { ms: 1500, label: "ขอให้อาจารย์เมตตา", f(g, W, H, t) { ground(g, W, H); const cx = W / 2; sp(g, PAPER, cx + 14, H - 3 - 16, 2, ON); rect(g, cx + 6, H - 9, 4, 6, DIM); for (let s = 0; s < 3; s++) { const sx = cx + 5 + s * 3; rect(g, sx, H - 15, 1, 6, ON); const n = Math.floor(clamp(t / .5) * 16); for (let k = 0; k < n; k++) if (hash(k, s + Math.floor(t * 8)) > .25) px(g, sx + Math.sin(k * .5 + t * 9 + s) * 2, H - 16 - k * 2, k > 9 ? DIM : ON); } sp(g, Math.sin(t * 14) > 0 ? BOW : STAND, cx - 32, H - 3 - MAN_H); } },
  { ms: 1500, label: "ส่งแล้ว แล้วแต่ดวง", f(g, W, H, t) { const roll = t < .62, tick = Math.floor(t * 16), v = roll ? 1 + Math.floor(hash(tick, 4) * 6) : 6, cx = W / 2 + (roll ? (hash(tick, 5) - .5) * 18 : 0), cy = H / 2 + (roll ? (hash(tick, 6) - .5) * 10 : 0), s = 30; for (let i = 0; i < 2; i++) frame(g, cx - s / 2 + i, cy - s / 2 + i, s - 2 * i, s - 2 * i, ON); DICE_L[v].forEach((i) => rect(g, cx + DICE_P[i][0] - 2, cy + DICE_P[i][1] - 2, 4, 4, HI)); if (!roll) dust(g, cx, cy + s / 2, clamp((t - .62) / .3)); } },
  { ms: 1500, label: "ทันนาทีสุดท้าย", lastMinute: true, f(g, W, H, t) { const cx = W / 2, cy = H / 2, r = Math.min(H / 2 - 3, 20); disc(cx, cy, r, (x, y) => { if ((x - cx) ** 2 + (y - cy) ** 2 >= (r - 2) ** 2) px(g, x, y, ON); }); const p = out(clamp(t / .72)), a = -1.5708 + (1 - p) * 40, b = -1.5708 + (1 - p) * 9; line(g, cx, cy, cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5), HI, 2); line(g, cx, cy, cx + Math.cos(b) * (r - 9), cy + Math.sin(b) * (r - 9), ON, 2); if (t > .72) for (let i = 0; i < 14; i++) { const an = i / 14 * 6.283, q = clamp((t - .72) / .28) * 12; px(g, cx + Math.cos(an) * (r + q), cy + Math.sin(an) * (r + q) * .8, HI); } } },
];

export const CRT_SCENES: Record<CrtKind, Scene[]> = { present: PRESENT, absent: ABSENT, no_class: NO_CLASS, submit: SUBMIT };

/** ภาพที่สุ่มได้ของปุ่มนี้ · "ทันนาทีสุดท้าย" เข้ากองเฉพาะตอนส่งใกล้หมดเวลา */
export const scenePool = (kind: CrtKind, lastMinute = false) => CRT_SCENES[kind].filter((s) => lastMinute || !s.lastMinute);

/** สุ่มเลขแบบ ไม่ซ้ำแบบล่าสุดติดกัน */
export function pickScene(n: number, last: number, rnd = Math.random()) {
  const skip = last >= 0 && last < n && n > 1;
  const i = Math.floor(rnd * (skip ? n - 1 : n));
  return skip && i >= last ? i + 1 : i;
}

/** วาด 1 เฟรม (t = 0–1) แล้วจางช่วงท้าย */
export function drawScene(g: G, W: number, H: number, t: number, scene: Scene) {
  g.clearRect(0, 0, W, H);
  g.globalAlpha = 1;
  scene.f(g, W, H, t);
  if (t > FADE) {
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = `rgba(0,0,0,${(t - FADE) / (1 - FADE)})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";
  }
}
