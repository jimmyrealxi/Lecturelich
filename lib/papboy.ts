// Pap-Boy v1 (วาดเองทั้งหมด · พอร์ตจาก docs/mockups/papboy-v1.html + b5-game.html) — parody ไม่ใช้ภาพ/ชื่อ/ฟอนต์ของเกมใด
// ของแต่งตัว + ค่ากล่อง (LOOT_CONFIG ต้องตรงกับ loot_value() ใน migration ขั้น 7 — มีเทสต์เทียบ)
// ท่าประจำ = แบห้านิ้ว (มือซ้ายของภาพยกขึ้นโบก) ไม่ใช่ชูนิ้วโป้ง
// วาดพิกเซลลง canvas ครั้งเดียวต่อชุดเป็น sprite sheet (FRAMES เฟรม) แล้วต่อเฟรมแค่ drawImage

export type Rarity = "n" | "m" | "r" | "u";
export const RARITY_COLOR: Record<Rarity, string> = { n: "#E8E8E8", m: "#8AB0FF", r: "#F2C230", u: "#EE8A3C" };
export const RARITY_NAME: Record<Rarity, string> = { n: "ปกติ", m: "magic", r: "rare", u: "unique" };

type Opt = readonly [value: string, name: string, rarity: Rarity];
// ตัวแรกของแต่ละช่อง = ของพื้นฐาน (มีตั้งแต่แรก ไม่ดรอป)
export const SLOTS = [
  { k: "glow", l: "สีจอหน้า", o: [["yellow", "เหลือง", "n"], ["green", "เขียว", "n"], ["cyan", "ฟ้าน้ำแข็ง", "m"], ["pink", "ชมพู", "r"]] },
  { k: "mouth", l: "ปาก", o: [["smile", "ยิ้ม", "n"], ["cat", "ปากแมว", "m"], ["fang", "เขี้ยว", "m"], ["tongue", "แลบลิ้น", "r"]] },
  { k: "eyes", l: "แว่น", o: [["none", "ไม่ใส่", "n"], ["round", "แว่นกลม", "m"], ["hud", "จอ HUD", "u"]] },
  { k: "ears", l: "หู", o: [["none", "ไม่มี", "n"], ["cat", "หูแมว", "m"], ["bunny", "หูกระต่าย", "r"], ["speaker", "หูลำโพง", "r"]] },
  { k: "hat", l: "หมวก", o: [["none", "ไม่ใส่", "n"], ["beanie", "ไหมพรม", "n"], ["grad", "หมวกบัณฑิต", "u"]] },
  { k: "outfit", l: "เสื้อ", o: [["hoodie", "ฮู้ดส้ม", "n"], ["lab", "เสื้อกาวน์", "m"], ["jacket", "แจ็กเก็ตทอง", "r"]] },
  { k: "scarf", l: "ผ้าพันคอ", o: [["none", "ไม่มี", "n"], ["red", "แดงปลิว", "m"]] },
  { k: "shoes", l: "รองเท้า", o: [["plain", "ธรรมดา", "n"], ["sneaker", "ผ้าใบแดง", "m"], ["gold", "บูตทอง", "r"]] },
  { k: "held", l: "ของถือ", o: [["none", "มือเปล่า", "n"], ["pencil", "ดินสอยักษ์", "r"], ["laser", "ปากกาเลเซอร์", "u"]] },
  { k: "wings", l: "ปีก", o: [["none", "ไม่มี", "n"], ["paper", "ปีกกระดาษ", "r"], ["pixel", "ปีกพิกเซล", "m"], ["light", "ปีกแสง", "u"]] },
  { k: "back", l: "ออร่าหลัง", o: [["none", "ไม่มี", "n"], ["ring", "วงแหวน", "m"], ["flame", "เปลวทอง", "r"], ["stars", "ดาวหมุน", "u"]] },
  { k: "ground", l: "ออร่าพื้น", o: [["none", "ไม่มี", "n"], ["bloom", "ดอกไม้", "n"], ["ripple", "คลื่นน้ำ", "m"], ["rune", "วงเวท", "r"], ["fire", "ไฟใต้เท้า", "u"]] },
  { k: "fx", l: "อนุภาค", o: [["none", "ไม่มี", "n"], ["spark", "ประกาย", "m"], ["binary", "เลข 0/1", "r"]] },
  { k: "pet", l: "สัตว์เลี้ยง", o: [["none", "ไม่มี", "n"], ["floppy", "ดิสก์บิน", "r"]] },
  { k: "bg", l: "ฉากหลัง", o: [["plain", "ห้องน้ำเงิน", "n"], ["stars", "ฟ้ากลางคืน", "m"]] },
] as const satisfies readonly { k: string; l: string; o: readonly Opt[] }[];

export type Slot = (typeof SLOTS)[number]["k"];
/** cls/asc = คลาสและสายย่อยของเทอมนี้ (รหัสใน lib/classes.ts) · ไม่ใช่ของในตู้ แต่ติดไปกับ look ให้ทุกหน้าวาดตรงกัน */
export type Look = Record<Slot, string> & { cls?: string | null; asc?: string | null };
export const DEFAULT_LOOK = Object.fromEntries(SLOTS.map((s) => [s.k, s.o[0][0]])) as Look;
export type Item = { id: string; k: Slot; v: string; name: string; r: Rarity; slot: string; isDefault: boolean };
export const ITEMS: Item[] = SLOTS.flatMap((s) =>
  (s.o as readonly Opt[]).map(([v, name, r], i) => ({ id: `${s.k}.${v}`, k: s.k, v, name, r, slot: s.l, isDefault: i === 0 })),
);
export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
/** ชุดที่เก็บใน DB อาจมีช่องไม่ครบ/ค่าแปลก → เติมของพื้นฐาน */
export function fullLook(look: Partial<Record<string, string>> | null | undefined): Look {
  const out = { ...DEFAULT_LOOK };
  for (const s of SLOTS) {
    const v = look?.[s.k];
    if (v && itemById(`${s.k}.${v}`)) out[s.k] = v;
  }
  return out;
}

export const LOOT_CONFIG = {
  ironEvery: 50, // กล่องเหล็ก 1 ใบต่อ XP สะสมทุก 50
  oddsN: 60, oddsM: 28, oddsR: 10, oddsU: 2, // % ในกล่องเหล็ก
  pity: 10, // ไม่เจอ rare ขึ้นไปติดกัน 10 กล่อง → ใบถัดไป rare แน่นอน
  dupN: 5, dupM: 15, dupR: 40, dupU: 120, // ได้ซ้ำ → เศษชอล์ก
  silverAttend: 10, silverPhoto: 5, silverEarly: 3, silverReview: 10, // กล่องเงิน: เข้าเรียน · จดมีรูป · ส่งก่อน ≥1 วัน · ทวน
  craftN: 10, craftM: 30, craftR: 80, craftU: 200, // แลกเศษชอล์กเป็นของที่ยังไม่มี
} as const;

// ---------- วาด ----------
export const FRAMES = 48; // วง 4 วิที่ 12 ครั้ง/วิ · ทุกจังหวะในตัวปรับให้ลงตัวกับ 48
const OUT = "#14213A";
const GLOW: Record<string, string> = { yellow: "#F2C230", green: "#86D99B", cyan: "#6FE3F0", pink: "#FF8FC8" };
export const glowOf = (look: Look) => (look.glow === DEFAULT_LOOK.glow && artOf(look)?.glow) || (GLOW[look.glow] ?? GLOW.yellow);
const OUTFIT: Record<string, [string, string]> = { hoodie: ["#E07A3F", "#B85A26"], lab: ["#F3F5F8", "#C7CDD6"], jacket: ["#1E3D74", "#152C55"] };
const SHOE: Record<string, string> = { plain: "#2B2B3A", sneaker: "#C2372C", gold: "#C9A25B" };
const rnd = (i: number) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

let c: CanvasRenderingContext2D;
let st: Look;
let art: Art | null = null; // ร่างของคลาสที่กำลังวาด
let A = 1; // ความทึบรวมของตัว (ร่างผี)
function P(x: number, y: number, col: string, a = 1) { c.globalAlpha = a * A; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); }
function R(x: number, y: number, w: number, h: number, col: string, a = 1) { c.globalAlpha = a * A; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(cx: number, cy: number, r: number, col: string, a = 1) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) P(cx + x, cy + y, col, a); }
function ell(cx: number, cy: number, rx: number, ry: number, col: string, a = 1, ring = false) {
  for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) {
    const v = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    if (ring ? Math.abs(v - 1) < (1.3 / Math.min(rx, ry)) * 1.4 : v <= 1) P(cx + x, cy + y, col, a);
  }
}
function box(x: number, y: number, w: number, h: number, col: string) { R(x, y, w, 1, col); R(x, y + h - 1, w, 1, col); R(x, y, 1, h, col); R(x + w - 1, y, 1, h, col); }
type Shape = { k: "r"; x: number; y: number; w: number; h: number; c: string } | { k: "d"; x: number; y: number; r: number; c: string } | { k: "e"; x: number; y: number; rx: number; ry: number; c: string };
const rr = (x: number, y: number, w: number, h: number, col: string): Shape => ({ k: "r", x, y, w, h, c: col });
/** หลายชิ้นขอบรวมเป็นเงาเดียว: ขอบก่อน แล้วค่อยเติมสี */
function shapes(list: Shape[]) {
  for (const s of list) s.k === "r" ? R(s.x - 1, s.y - 1, s.w + 2, s.h + 2, OUT) : s.k === "d" ? disc(s.x, s.y, s.r + 1, OUT) : ell(s.x, s.y, s.rx + 1, s.ry + 1, OUT);
  for (const s of list) s.k === "r" ? R(s.x, s.y, s.w, s.h, s.c) : s.k === "d" ? disc(s.x, s.y, s.r, s.c) : ell(s.x, s.y, s.rx, s.ry, s.c);
}

function drawBg(f: number) {
  R(0, 0, 64, 64, "#13233D");
  if (st.bg === "stars") { R(0, 0, 64, 64, "#0B1530"); for (let i = 0; i < 26; i++) P(rnd(i) * 64, rnd(i + 50) * 48, "#F4F6FA", (f + i * 7) % 48 < 40 ? 0.9 : 0.25); }
  R(0, 56, 64, 8, "#0E1A2E"); for (let x = 0; x < 64; x += 8) R(x, 56, 1, 8, "#1A2C4E"); R(0, 56, 64, 1, "#22365A");
}
function drawBack(f: number) {
  const cx = 32, cy = 29;
  if (st.back === "ring") {
    disc(cx, cy, 17, "#8AB0FF", 0.1);
    for (let a = 0; a < Math.PI * 2; a += 0.045) P(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, "#8AB0FF", Math.floor((a + f * (0.7 / 48) * 5) / 0.35) % 2 === 0 ? 0.95 : 0.25);
    for (let a = 0; a < Math.PI * 2; a += 0.06) P(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, "#C9DAFF", 0.35);
  }
  if (st.back === "flame") for (let x = 12; x <= 52; x++) {
    const h = 17 + 5 * Math.sin(x * 0.55 + f * ((2 * Math.PI * 5) / 48)) + 3 * Math.sin(x * 1.3 - f * ((2 * Math.PI * 7) / 48)) - Math.abs(x - 32) * 0.45;
    for (let y = 0; y < h; y++) { const t = y / h; P(x, 52 - y, t < 0.45 ? "#EE8A3C" : t < 0.8 ? "#F2C230" : "#FFE680", 0.5 * (1 - t * 0.5)); }
  }
  if (st.back === "stars") {
    disc(cx, 27, 16, "#FFE680", 0.1); disc(cx, 27, 12, "#FFE680", 0.12);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + f * (Math.PI / 4 / 48), x = cx + Math.cos(a) * 22, y = 28 + Math.sin(a) * 15, col = i % 2 ? "#FFE680" : "#EE8A3C";
      P(x, y, col); if ((f + i * 3) % 12 < 8) { P(x - 1, y, col, 0.8); P(x + 1, y, col, 0.8); P(x, y - 1, col, 0.8); P(x, y + 1, col, 0.8); }
    }
  }
}
function drawWings(f: number, b: number) {
  if (st.wings === "none") return;
  const flap = f % 8 < 4 ? 0 : 1, L = [5, 8, 10, 12, 12, 11, 10, 8, 6, 4, 3, 2], rows: [number, number, number][] = [];
  L.forEach((len, i) => { const y = 29 + i + b - (i < 4 ? flap : 0); rows.push([24 - len, y, len], [40, y, len]); });
  rows.forEach(([x, y, w]) => R(x - 1, y - 1, w + 2, 3, OUT));
  rows.forEach(([x, y, w], j) => {
    const i = j >> 1;
    for (let k = 0; k < w; k++) {
      const px = x + k, near = (px < 32 ? x + w - 1 - px : px - x) / w;
      let col: string, a = 1;
      if (st.wings === "paper") { col = i % 3 === 2 ? "#8AB0FF" : "#F3F5F8"; if (Math.abs(px - 32) === 9) col = "#C2372C"; }
      else if (st.wings === "pixel") col = (px + y) % 2 ? "#8AB0FF" : "#5B7FD6";
      else { col = near < 0.35 ? "#FFE680" : near < 0.7 ? "#F2C230" : "#EE8A3C"; a = 0.92; }
      P(px, y, col, a);
    }
  });
  if (st.wings === "light") for (let i = 0; i < 4; i++) if ((f + i * 4) % 12 < 6) { P(10 + i * 2, 30 + i * 3 + b, "#FFF6C8"); P(54 - i * 2, 30 + i * 3 + b, "#FFF6C8"); }
}
function drawGround(f: number) {
  ell(32, 55, 11, 2, "#000", 0.28);
  const g = st.ground;
  if (g === "rune") {
    ell(32, 55, 17, 4, "#8AB0FF", 0.9, true); ell(32, 55, 12, 3, "#8AB0FF", 0.5, true);
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + f * ((Math.PI / 144) * 5); P(32 + Math.cos(a) * 17, 55 + Math.sin(a) * 4, "#E8F0FF"); P(32 + Math.cos(a) * 17 + 1, 55 + Math.sin(a) * 4, "#E8F0FF", 0.6); }
  }
  if (g === "ripple") for (let k = 0; k < 3; k++) { const rx = 5 + ((f * 0.375 + k * 6) % 18); ell(32, 55, rx, Math.max(1, rx / 4), "#6FE3F0", Math.max(0, 0.9 - rx / 20), true); }
  if (g === "fire") { ell(32, 55, 16, 3, "#EE8A3C", 0.3); for (let x = 17; x <= 47; x += 2) { const h = 2 + ((f + x * 3) % 6); for (let y = 0; y < h; y++) P(x, 57 - y, y < h - 2 ? "#EE8A3C" : "#FFE680", 0.85); } }
  if (g === "bloom") ([[19, "#FF8FC8"], [23, "#F2C230"], [41, "#FF8FC8"], [45, "#8AB0FF"], [16, null], [27, null], [38, null], [48, null]] as const).forEach(([x, col], i) => {
    const sw = ((f >> 2) + i) % 2; P(x, 56, "#5FBF6A"); P(x + sw, 55, "#5FBF6A");
    if (col) { P(x + sw, 54, col); P(x + sw - 1, 54, col, 0.7); P(x + sw + 1, 54, col, 0.7); P(x + sw, 53, col, 0.7); }
  });
}
/** มือซ้ายของภาพแบห้านิ้ว (กลางฝ่ามือ ≈ (19,27) ในกรอบ 64) · d = โบกซ้าย/ขวา */
export const PALM = { x: 19, y: 27 } as const;
/** ท่าเปลี่ยนตามสิ่งที่ทำ (หน้าวันนี้ · docs/mockups/inspire-anim.html) · palm = ท่าประจำตัว */
export type Pose = "palm" | "read" | "cheer" | "write" | "hand";
function armsOf(pose: Pose, t: number, u: number, shirt: string, hx = 39): { back: Shape[]; front: Shape[] } {
  const S = (x: number, y: number, w = 3, h = 3) => rr(x, y + u, w, h, shirt), H = (x: number, y: number, w = 3, h = 3) => rr(x, y + u, w, h, "#F4F6FA");
  if (pose === "hand") return { back: [H(22, 45, 3, 2), S(22, 39, 3, 6), S(39, 36), S(41, 33), S(43, 29, 3, 5), S(44, 22 - t, 3, 8), H(44, 18 - t, 3, 4)], front: [] };
  if (pose === "cheer") return { back: [S(22, 36), S(20, 33), S(18, 30), H(16, 27), S(39, 36), S(41, 33), S(43, 30), H(45, 27)], front: [] };
  if (pose === "read") return { back: [S(22, 39, 3, 4), S(39, 39, 3, 4)], front: [rr(25, 40 + u, 14, 7, "#F3EAD2"), H(22, 42), H(39, 42)] };
  if (pose === "write") return { back: [S(22, 39, 3, 4), S(39, 39, 3, 4)], front: [rr(23, 40 + u, 10, 8, "#FBF5E6"), H(22, 44), S(37, 43, 3, 2), H(33 + t * 2, 43)] };
  // palm: แขนซ้ายของภาพยกเฉียงขึ้น · แขนขวาห้อยถือของ (ฝ่ามือวาดหลังหัวในวง drawBody)
  return { back: [S(21, 37), S(20, 35), S(19, 33), S(18, 30, 3, 4), S(hx, 39, 3, 6), H(hx, 45, 3, 2)], front: [] };
}
function drawBody(f: number, b: number, pose: Pose) {
  const k = art, classFit = !!k && st.outfit === DEFAULT_LOOK.outfit; // ใส่ของดรอป = ใช้ของนั้น · ยังไม่ใส่ = ชุดประจำคลาส
  const [shirt, shade] = k && classFit ? [k.shirt, k.shade] : OUTFIT[st.outfit] ?? OUTFIT.hoodie, helm = k?.helm ?? "#EEF1F5", list: Shape[] = [];
  const hx = k?.build === "wide" ? 42 : 39, shoe = (st.shoes === DEFAULT_LOOK.shoes && k?.shoe) || (SHOE[st.shoes] ?? SHOE.plain);
  const d = f % 12 < 6 ? 0 : 1, G = "#F4F6FA", arms = armsOf(pose, d, b, shirt, hx);
  const sy = pose === "read" ? -2 : pose === "cheer" ? b : 0; // เท้า: นั่ง = ยกขึ้นบนกองหนังสือ · ดีใจ = กระโดด
  if (pose === "read") shapes([rr(21, 52, 22, 3, "#8A5A2B"), rr(23, 50, 18, 2, "#2B4A8A")]);
  if (st.ears === "cat") for (let i = 0; i < 6; i++) list.push(rr(22, 12 + i + b, i + 1, 1, helm), rr(42 - i, 12 + i + b, i + 1, 1, helm));
  if (st.ears === "bunny") list.push({ k: "e", x: 27, y: 9 + b, rx: 2, ry: 6, c: helm }, { k: "e", x: 37, y: 9 + b, rx: 2, ry: 6, c: helm });
  if (st.ears === "speaker") list.push(rr(18, 22 + b, 3, 9, "#8C97AA"), rr(43, 22 + b, 3, 9, "#8C97AA"));
  list.push(
    ...(k ? legsOf(k, shoe, sy) : [
      ...(pose === "read" ? [rr(27, 48, 3, 3, "#2E3A55"), rr(34, 48, 3, 3, "#2E3A55")] : [rr(27, 47 + sy, 3, 6, "#2E3A55"), rr(34, 47 + sy, 3, 6, "#2E3A55")]),
      rr(26, 52 + sy, 4, 2, shoe), rr(34, 52 + sy, 4, 2, shoe),
    ]),
    ...arms.back,
    ...(k ? torsoOf(k, shirt, shade, b) : [rr(25, 37 + b, 14, 12, shirt)]),
    { k: "d", x: 32, y: 26 + b, r: 11, c: helm },
  );
  shapes(list);
  if (k) { hemOf(k, shirt, f, b); k.head?.(f, b); }
  if (st.ears === "cat") for (let i = 2; i < 5; i++) { R(23, 12 + i + b, i - 1, 1, "#FF8FC8"); R(43 - i + 1, 12 + i + b, i - 1, 1, "#FF8FC8"); }
  if (st.ears === "bunny") { R(27, 6 + b, 1, 6, "#FF8FC8"); R(37, 6 + b, 1, 6, "#FF8FC8"); }
  if (st.ears === "speaker") for (let y = 24; y < 30; y += 2) { P(19, y + b, OUT); P(44, y + b, OUT); }
  if (st.shoes === "sneaker") { R(26, 53 + sy, 4, 1, "#F3F5F8"); R(34, 53 + sy, 4, 1, "#F3F5F8"); }
  if (st.shoes === "gold") { P(27, 52 + sy, "#FFE680"); P(35, 52 + sy, "#FFE680"); }
  if (st.outfit === "hoodie" && !classFit) { R(28, 44 + b, 8, 3, shade); P(30, 38 + b, "#F3F5F8"); P(30, 39 + b, "#F3F5F8"); P(33, 38 + b, "#F3F5F8"); P(33, 39 + b, "#F3F5F8"); }
  if (st.outfit === "lab") { R(31, 37 + b, 1, 12, shade); R(34, 41 + b, 3, 3, shade); P(35, 40 + b, "#1E3D74"); R(25, 37 + b, 3, 2, shade); R(36, 37 + b, 3, 2, shade); }
  if (st.outfit === "jacket") { R(31, 37 + b, 2, 12, "#F2C230"); R(25, 47 + b, 14, 1, "#F2C230"); R(39, 44 + b, 3, 1, "#F2C230"); }
  for (let x = 24; x <= 40; x++) P(x, 35 + b, "#C9D0DB");
  P(25, 19 + b, "#FFFFFF"); P(26, 18 + b, "#FFFFFF"); P(27, 18 + b, "#FFFFFF");
  // จอหน้า (ท่าแบห้านิ้ว = ตายิ้ม ^ ^ แต่ยังกะพริบ)
  const g = glowOf(st);
  R(24, 21 + b, 17, 11, "#0E1A2E"); P(24, 21 + b, helm); P(40, 21 + b, helm); P(24, 31 + b, helm); P(40, 31 + b, helm);
  for (let y = 22; y < 31; y += 2) R(25, y + b, 15, 1, g, 0.06);
  k?.screen?.(f, b, g);
  const down = pose === "read" || pose === "write", open = pose === "cheer" || pose === "hand";
  if (pose === "palm" && k?.eye) k.eye(f, b, g);
  else if (f % 48 > 45) { R(27, 25 + b, 2, 1, g); R(36, 25 + b, 2, 1, g); }
  else if (down) { R(27, 26 + b, 2, 2, g); R(36, 26 + b, 2, 2, g); }
  else if (pose === "hand") { R(27, 24 + b, 2, 3, g); R(36, 24 + b, 2, 3, g); P(27, 24 + b, "#FFFFFF", 0.7); P(36, 24 + b, "#FFFFFF", 0.7); }
  else ([[0, 1], [1, 0], [2, 1]] as const).forEach(([dx, dy]) => { P(26 + dx, 24 + dy + b, g); P(35 + dx, 24 + dy + b, g); });
  const m = pose === "palm" && st.mouth === DEFAULT_LOOK.mouth && k?.mouth ? k.mouth : st.mouth;
  if (m === "flat") R(30, 29 + b, 5, 1, g);
  else if (m === "o") R(31, 28 + b, 2, 2, g);
  else if (m === "smile" && open) R(30, 28 + b, 4, 2, g);
  else if (m === "smile" && down) R(30, 29 + b, 4, 1, g);
  else if (m === "cat") ([[29, 28], [30, 29], [31, 28], [32, 28], [33, 29], [34, 28]] as const).forEach(([x, y]) => P(x, y + b, g));
  else { P(29, 28 + b, g); R(30, 29 + b, 4, 1, g); P(34, 28 + b, g); if (m === "fang") P(33, 30 + b, "#FFFFFF"); if (m === "tongue") R(31, 30 + b, 2, 1, "#FF8FC8"); }
  if (st.eyes === "round") { box(25, 22 + b, 6, 6, "#C9A25B"); box(34, 22 + b, 6, 6, "#C9A25B"); R(31, 24 + b, 3, 1, "#C9A25B"); }
  if (st.eyes === "hud") { R(25, 22 + b, 15, 1, "#6FE3F0", 0.9); for (let x = 26; x < 40; x += 3) P(x, 23 + b, "#6FE3F0", 0.6); P(39, (f % 8 < 4 ? 24 : 25) + b, "#FF5A5A"); }
  if (st.scarf === "red") { R(25, 36 + b, 14, 2, "#C2372C"); const w = f % 8 < 4 ? 0 : 1; R(36 + w, 38 + b, 2, 4, "#C2372C"); P(38 + w, 41 + b, "#8F2620"); }
  if (st.hat === "beanie") { for (let y = -9; y <= 0; y++) for (let x = -10; x <= 10; x++) if (x * x + y * y <= 96) P(32 + x, 21 + y + b, "#C2372C"); R(22, 19 + b, 21, 2, "#F3F5F8"); disc(32, 10 + b, 2, "#F3F5F8"); }
  if (st.hat === "grad") { R(27, 14 + b, 11, 3, OUT); R(20, 13 + b, 25, 2, OUT); R(21, 13 + b, 23, 1, "#2B2B3A"); R(43, 14 + b, 1, 5, "#F2C230"); R(42, 19 + b, 3, 2, "#F2C230"); }
  if (k && classFit) k.outfit?.(f, b);
  if (k && st.hat === DEFAULT_LOOK.hat) k.hat?.(f, b);
  // ฝ่ามือ 4 นิ้ว + นิ้วโป้ง (ช่องระหว่างนิ้ว = สีขอบ) ทับขอบหัว
  if (pose === "palm") shapes([rr(16 - d, 24 + b, 7, 6, G), rr(22 - d, 21 + b, 1, 4, G), rr(20 - d, 20 + b, 1, 5, G), rr(18 - d, 20 + b, 1, 5, G), rr(16 - d, 21 + b, 1, 4, G), rr(23 - d, 27 + b, 2, 2, G)]);
  else {
    shapes(arms.front);
    if (pose === "read") { R(31, 40 + b, 2, 7, "#8C7B60"); for (let y = 42; y < 46; y += 2) { R(26, y + b, 4, 1, "#B9A985"); R(34, y + b, 4 - (d && y === 44 ? 2 : 0), 1, "#B9A985"); } }
    if (pose === "write") { for (let y = 42; y < 47; y += 2) R(24, y + b, 8, 1, "#8FA6CC"); const px = 35 + d * 2; for (let i = 0; i < 5; i++) P(px + i, 43 + b - i, i < 4 ? "#F2C230" : "#FF8FC8"); P(px - 1, 44 + b, OUT); }
    if (pose === "cheer" && d) ([[14, 22], [50, 22], [12, 30], [52, 30]] as const).forEach(([x, y]) => { P(x, y, "#F2C230"); P(x - 1, y, "#F2C230", 0.6); P(x + 1, y, "#F2C230", 0.6); P(x, y - 1, "#F2C230", 0.6); P(x, y + 1, "#F2C230", 0.6); });
    return; // มือไม่ว่าง: ไม่วาดของถือ
  }
  c.save(); c.translate(hx - 39, 0); // ตัวบึกแขนอยู่ห่างออกไป
  if (k && st.held === DEFAULT_LOOK.held) k.held?.(f, b);
  if (st.held === "pencil") { P(41, 47 + b, OUT); for (let i = 1; i < 9; i++) { P(41 + i, 47 - i + b, "#F2C230"); P(42 + i, 47 - i + b, "#C9A25B"); } P(50, 38 + b, "#FF8FC8"); P(51, 38 + b, "#FF8FC8"); }
  if (st.held === "laser") { for (let i = 0; i < 7; i++) P(42 + i, 46 - i + b, "#AEB6C4"); P(49, 39 + b, "#FF5A5A"); if (f % 6 < 4) { P(50, 38 + b, "#FF5A5A", 0.6); P(49, 38 + b, "#FF5A5A", 0.4); P(50, 39 + b, "#FF5A5A", 0.4); } }
  c.restore();
}
function drawFront(f: number) {
  if (st.fx === "spark") for (let i = 0; i < 7; i++) {
    const x = 16 + ((i * 41) % 32), y = 54 - ((f * (38 / 48) + i * 9) % 38), a = 1 - (54 - y) / 40;
    P(x, y, "#FFE680", a); if ((f + i) % 6 < 4) { P(x - 1, y, "#FFE680", a * 0.6); P(x + 1, y, "#FFE680", a * 0.6); P(x, y - 1, "#FFE680", a * 0.6); P(x, y + 1, "#FFE680", a * 0.6); }
  }
  if (st.fx === "binary") for (let i = 0; i < 7; i++) {
    const x = 12 + ((i * 37) % 40), y = 54 - ((f * (42 / 48) + i * 11) % 42), a = Math.max(0, 1 - (54 - y) / 44), col = glowOf(st);
    if (i % 2) R(x + 1, y, 1, 5, col, a); else { R(x, y, 3, 1, col, a); R(x, y + 4, 3, 1, col, a); R(x, y, 1, 5, col, a); R(x + 2, y, 1, 5, col, a); }
  }
  if (st.pet === "floppy") {
    const x = 52, y = 22 + (f % 12 < 6 ? 0 : 1), w = f % 4 < 2;
    R(x - 5, y - 5, 11, 11, OUT); R(x - 4, y - 4, 9, 9, "#1E3D74"); R(x - 3, y - 4, 7, 4, "#F3F5F8"); P(x - 2, y - 3, OUT); P(x + 2, y - 3, OUT);
    R(x - 2, y + 1, 5, 3, "#AEB6C4"); P(x + 1, y + 2, "#1E3D74"); R(x - 7, y - 2 + (w ? 0 : 1), 2, 1, "#F4F6FA"); R(x + 6, y - 2 + (w ? 0 : 1), 2, 1, "#F4F6FA");
  }
}

// ---------- ร่างตามคลาส (docs/mockups/b8-classes.html) · รหัสตรงกับ lib/classes.ts ----------
// ล็อกกับคลาส ของดรอปทับไม่ได้: build helm head screen eye back fx · ชุดประจำคลาสจะโผล่เมื่อช่องนั้นยังเป็นของพื้นฐาน: shirt shoe glow hat held outfit
type Draw = (f: number, b: number) => void;
type DrawG = (f: number, b: number, g: string) => void;
type Art = {
  build: "coat" | "lean" | "wide" | "float"; helm?: string; glow?: string; shirt: string; shade: string; shoe?: string;
  noLegs?: boolean; ghost?: boolean; mouth?: "flat" | "o" | "fang";
  head?: Draw; screen?: DrawG; eye?: DrawG; back?: (f: number) => void; fx?: Draw; hat?: Draw; held?: Draw; outfit?: Draw;
};
const artOf = (look: Look): Art | null => CLASS_ART[look.asc ?? ""] ?? CLASS_ART[look.cls ?? ""] ?? null;
const dd = (x: number, y: number, r: number, col: string): Shape => ({ k: "d", x, y, r, c: col });
const cap = (col: string, b: number, top = -11, end = -3) => { for (let y = top; y <= end; y++) for (let x = -11; x <= 11; x++) if (x * x + y * y <= 128) P(32 + x, 26 + b + y, col); };
const dots = (list: [number, number][], b: number, col: string) => list.forEach(([x, y]) => P(x, y + b, col));
const orbit = (f: number, n: number, rx: number, ry: number, cy: number, fn: (x: number, y: number, front: boolean) => void) => { for (let i = 0; i < n; i++) { const a = (i * 2 * Math.PI) / n + (f * Math.PI) / 24; fn(32 + Math.cos(a) * rx, cy + Math.sin(a) * ry, Math.sin(a) > -0.3); } };
const MOVE: Record<Art["build"], (f: number) => number> = { coat: (f) => (f % 24 < 12 ? 1 : 2), lean: (f) => (f % 6 < 3 ? 0 : 1), wide: (f) => (f % 48 < 24 ? 0 : 1), float: (f) => Math.round(Math.sin((f * Math.PI) / 24) * 2) - 2 };
const LEG = "#2E3A55";
function legsOf(k: Art, shoe: string, sy: number): Shape[] {
  if (k.noLegs || k.build === "float") return [];
  if (k.build === "wide") return [rr(25, 50 + sy, 5, 4, LEG), rr(34, 50 + sy, 5, 4, LEG), rr(24, 53 + sy, 7, 2, shoe), rr(33, 53 + sy, 7, 2, shoe)];
  if (k.build === "lean") return [rr(28, 49 + sy, 2, 5, LEG), rr(34, 49 + sy, 2, 5, LEG), rr(27, 54 + sy, 4, 1, shoe), rr(33, 54 + sy, 4, 1, shoe)];
  return [rr(27, 53 + sy, 3, 1, LEG), rr(34, 53 + sy, 3, 1, LEG), rr(26, 54 + sy, 5, 1, shoe), rr(33, 54 + sy, 5, 1, shoe)];
}
function torsoOf(k: Art, S: string, D: string, b: number): Shape[] {
  if (k.build === "wide") return [rr(22, 37 + b, 20, 13, S), rr(18, 35 + b, 7, 5, D), rr(39, 35 + b, 7, 5, D)];
  if (k.build === "lean") return [rr(26, 37 + b, 12, 6, S), rr(28, 43 + b, 8, 6, S)];
  if (k.build === "coat") return [rr(25, 37 + b, 14, 12, S), rr(23, 48 + b, 18, 5, S), rr(24, 34 + b, 3, 4, D), rr(37, 34 + b, 3, 4, D)];
  return [rr(25, 37 + b, 14, 10, S), rr(24, 46 + b, 16, 6, S)];
}
function hemOf(k: Art, S: string, f: number, b: number) {
  if (k.build === "coat") for (let x = 23; x < 41; x += 3) R(x, 53 + b, 2, 1 + (x % 2), S);
  if (k.build === "float" || k.noLegs) for (let x = 24; x < 40; x += 3) R(x, 52 + b, 2, 2 + (((f >> 2) + x) % 4), S);
}
const pencilArt: Draw = (_f, b) => { P(41, 47 + b, OUT); for (let i = 1; i < 11; i++) { P(41 + i, 47 - i + b, "#F2C230"); P(42 + i, 47 - i + b, "#C9A25B"); } P(52, 36 + b, "#FF8FC8"); P(53, 36 + b, "#FF8FC8"); };
const textRows: DrawG = (f, b, g) => { for (let i = 0; i < 5; i++) R(25 + ((i * 7) % 5), 22 + ((i * 2 + (f >> 3)) % 9) + b, 5 + ((i * 3) % 7), 1, g, 0.3); };
const scrollBack = () => { shapes([rr(41, 29, 8, 17, "#5A3E22"), rr(42, 23, 3, 7, "#F3EAD2"), rr(46, 20, 3, 10, "#E0D3B4")]); R(41, 33, 8, 1, "#8A5A2B"); P(43, 27, "#A0281D"); P(47, 24, "#A0281D"); };
const wallClock = (x: number, y: number, r: number, f: number, sp: number) => {
  shapes([dd(x, y, r, "#F3EAD2")]);
  for (let i = 0; i < 12; i += 3) P(x + Math.round(Math.cos(i * 0.5236) * (r - 1)), y + Math.round(Math.sin(i * 0.5236) * (r - 1)), OUT);
  const a = (f * Math.PI) / sp;
  for (let i = 1; i < r; i++) P(x + Math.round(Math.cos(a) * i), y + Math.round(Math.sin(a) * i), "#A0281D");
  for (let i = 1; i < r - 3; i++) P(x + Math.round(Math.cos(a / 12) * i), y + Math.round(Math.sin(a / 12) * i), OUT);
};
const drain = (f: number, b: number) => R(25, 30 + b, Math.max(1, 15 - (f * 15) / 48), 1, "#FF5A5A");
const deskBack = () => { shapes([rr(14, 17, 36, 28, "#8A5A2B")]); R(14, 21, 36, 1, "#5A3E22"); R(14, 38, 36, 1, "#5A3E22"); R(16, 24, 5, 1, "#F3EAD2"); R(44, 27, 4, 1, "#F3EAD2"); R(17, 33, 3, 1, "#F3EAD2"); shapes([rr(16, 11, 3, 6, "#5A626F"), rr(45, 11, 3, 6, "#5A626F")]); };
const battery: DrawG = (f, b, g) => { const n = 1 + ((f >> 3) % 5); for (let i = 0; i < n; i++) R(26 + i * 3, 22 + b, 2, 2, g, 0.4); };
const grimoire = (f: number) => { const y = 25 + Math.round(Math.sin((f * Math.PI) / 24) * 2); shapes([rr(46, y, 6, 12, "#4B2E6B"), rr(52, y, 6, 12, "#35204C")]); R(51, y, 2, 12, "#C9A25B"); P(48, y + 4, "#FF8FC8"); R(47, y + 7, 3, 1, "#C9A25B"); R(54, y + 3, 3, 1, "#C9A25B"); };
const rune: DrawG = (f, b, g) => { for (let i = 0; i < 8; i++) { const a = i * 0.785 + f * 0.1309; P(32 + Math.cos(a) * 7, 26 + b + Math.sin(a) * 4, g, 0.5); } };
const rivets: Draw = (_f, b) => dots([[23, 20], [42, 20], [23, 31], [42, 31]], b, OUT);
const cards = (f: number, front: boolean) => orbit(f, 6, 25, 11, 30, (x, y, fr) => { if (fr === front) shapes([rr(x - 2, y - 1, 4, 3, "#F3EAD2")]); });

const CLASS_ART: Record<string, Art> = {
  scribe: {
    build: "coat", helm: "#E6DCC4", glow: "#86D99B", shirt: "#5B6B2F", shade: "#3F4C20", shoe: "#5A3E22", screen: textRows, back: scrollBack,
    head: (_f, b) => { R(27, 17 + b, 4, 1, "#2B4A8A"); R(33, 18 + b, 6, 1, "#2B4A8A"); R(29, 19 + b, 3, 1, "#2B4A8A"); R(22, 27 + b, 1, 3, "#2B4A8A"); },
    hat: (f, b) => { cap("#4F5A26", b, -11, -7); R(21, 19 + b, 23, 2, "#3F4C20"); R(44, 19 + b + (f % 8 < 4 ? 0 : 1), 4, 1, "#3F4C20"); },
    outfit: (_f, b) => { for (let i = 0; i < 10; i++) P(26 + i, 38 + i + b, "#8A5A2B"); shapes([rr(23, 43 + b, 7, 6, "#8A5A2B")]); R(24, 41 + b, 5, 2, "#F3EAD2"); },
    held: pencilArt,
  },
  wild_scribe: {
    build: "coat", noLegs: true, helm: "#E6DCC4", glow: "#86D99B", shirt: "#2C2A3A", shade: "#1E1D29", screen: textRows,
    head: (_f, b) => { R(21, 20 + b, 4, 10, OUT, 0.75); R(38, 16 + b, 5, 4, OUT, 0.75); },
    eye: (f, b, g) => { dots([[26, 23], [27, 24], [28, 25], [27, 26], [26, 27]], b, g); if (f % 12 < 7) R(35, 23 + b, 3, 5, g); },
    back: (f) => { shapes([rr(8, 9, 23, 30, "#3A2A20"), rr(33, 9, 23, 30, "#3A2A20")]); R(10, 11, 21, 26, "#F3EAD2"); R(33, 11, 21, 26, "#F3EAD2"); for (let y = 14; y < 34; y += 3) { R(12, y, 14, 1, "#64523F"); R(38, y, 14, 1, "#64523F"); } const t = (f >> 2) % 6; R(31 - t, 11, t * 2 + 2, 26, "#E0D3B4"); },
    fx: (f, b) => { for (let i = 0; i < 4; i++) { const t = (f + i * 12) % 48; R(25 + i * 5, 54 + b + t / 5, 1, 2, "#2B4A8A", 1 - t / 48); } },
    held: (_f, b) => { shapes([rr(41, 27 + b, 1, 20, "#F3EAD2")]); R(42, 27 + b, 3, 8, "#F3EAD2"); R(40, 28 + b, 1, 6, "#D9CDB2"); },
  },
  board_decoder: {
    build: "coat", helm: "#E6DCC4", glow: "#6FE3F0", shirt: "#2F5A63", shade: "#1F3E45", shoe: "#2B2B3A",
    head: (_f, b) => { R(26, 17 + b, 8, 1, "#F4F6FA"); R(38, 28 + b, 4, 3, "#F4F6FA", 0.6); },
    screen: (f, b, g) => ([[25, 23, 3], [29, 27, 4], [25, 29, 6]] as [number, number, number][]).forEach(([x, y, w], i) => R(x, y + b, w, 1, g, (f + i * 9) % 24 < 14 ? 0.4 : 0.15)),
    eye: (f, b, g) => { R(27, 25 + b, 2, 2, g); shapes([dd(37, 26 + b, 5, "#C9A25B")]); disc(37, 26 + b, 4, "#0E1A2E"); disc(37, 26 + b, 1 + (f % 24 < 12 ? 1 : 0), g); P(35, 24 + b, "#FFFFFF"); R(41, 30 + b, 3, 1, "#C9A25B"); R(43, 31 + b, 2, 1, "#C9A25B"); },
    back: (f) => { shapes([rr(9, 6, 46, 32, "#8A5A2B")]); R(11, 8, 42, 28, "#1F3A2D"); ([[13, 11, 10], [13, 15, 6], [13, 20, 12], [42, 11, 8], [44, 16, 6], [40, 25, 10], [13, 28, 8]] as [number, number, number][]).forEach(([x, y, w], i) => R(x, y, (f >> 1) % 12 > i ? w : Math.max(1, w - 4), 1, "#E8E8E8", 0.85)); },
    hat: (_f, b) => cap("#5A3E22", b, -11, -8),
    held: (f, b) => { shapes([rr(43, 41 + b, 6, 2, "#F4F6FA")]); for (let i = 0; i < 4; i++) { const t = (f + i * 12) % 48; P(47 + i, 40 - t / 5, "#E8E8E8", 1 - t / 48); } },
  },
  deadline: {
    build: "lean", glow: "#F2C230", shirt: "#8F2A1F", shade: "#6A1E16", shoe: "#2B2B3A",
    head: (_f, b) => { for (let x = 23; x < 31; x += 3) R(x, 17 + b, 1, 3, "#A0281D"); R(23, 18 + b, 8, 1, "#A0281D", 0.7); },
    screen: (f, b) => drain(f, b), back: (f) => wallClock(46, 23, 11, f, 4),
    hat: (f, b) => { R(21, 20 + b, 23, 2, "#C2372C"); R(43, 20 + b + (f % 8 < 4 ? 0 : 1), 5, 1, "#C2372C"); },
    held: (_f, b) => { shapes([dd(45, 45 + b, 3, "#F3EAD2")]); P(45, 45 + b, "#A0281D"); },
  },
  last_minute: {
    build: "lean", glow: "#FF5A5A", mouth: "flat", shirt: "#6B4A2A", shade: "#4B331C", shoe: "#5A3E22",
    head: (_f, b) => { R(35, 16 + b, 1, 20, "#A0281D"); R(24, 31 + b, 4, 1, "#A0281D"); },
    screen: (f, b, g) => { R(25, 26 + b, 15, 1, g, 0.3); R(32, 22 + b, 1, 9, g, 0.3); drain(f, b); },
    eye: (_f, b, g) => { R(27, 25 + b, 3, 1, g); R(35, 24 + b, 3, 3, g); P(36, 25 + b, "#0E1A2E"); },
    back: (f) => { for (let a = 0; a < 6.28; a += 0.05) P(32 + Math.cos(a) * 22, 26 + Math.sin(a) * 22, "#FF5A5A", Math.floor((a + f * 0.1309) / 0.52) % 2 ? 0.75 : 0.12); R(32, 1, 1, 7, "#FF5A5A"); R(32, 44, 1, 7, "#FF5A5A"); R(7, 26, 7, 1, "#FF5A5A"); R(50, 26, 7, 1, "#FF5A5A"); shapes([rr(18, 36, 8, 12, "#6A1E16"), rr(14, 46 + (f % 8 < 4 ? 0 : 1), 8, 5, "#6A1E16")]); },
    hat: (_f, b) => { shapes([rr(25, 8 + b, 15, 9, "#5A3E22"), rr(17, 16 + b, 31, 2, "#5A3E22")]); R(25, 14 + b, 15, 2, "#A0281D"); },
    held: (f, b) => { shapes([rr(42, 42 + b, 10, 3, "#8C97AA"), rr(42, 45 + b, 3, 3, "#5A626F")]); if (f % 24 < 3) R(53, 42 + b, 2, 3, "#FFE680"); },
  },
  early_courier: {
    build: "lean", glow: "#86D99B", shirt: "#2B4A8A", shade: "#1E3560", shoe: "#E8DFCB",
    screen: (f, b, g) => { for (let i = 0; i < 3; i++) R(25 + ((f + i * 5) % 15), 23 + i * 3 + b, 3, 1, g, 0.3); },
    eye: (_f, b, g) => ([[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]] as [number, number][]).forEach(([x, y]) => { P(26 + x, 23 + y + b, g); P(29 + x, 23 + y + b, g, 0.5); P(35 + x, 23 + y + b, g); P(38 + x, 23 + y + b, g, 0.5); }),
    back: (f) => { for (let k = 2; k >= 1; k--) for (let y = 28; y < 54; y++) R(26 - k * 5, y, 12, 1, "#6FE3F0", 0.2 / k); const w = f % 6 < 3 ? 0 : 1; shapes([rr(52, 14 - w, 8, 3, "#F4F6FA"), rr(54, 17 - w, 5, 2, "#F4F6FA"), rr(33, 14 - w, 6, 3, "#F4F6FA")]); wallClock(46, 18, 9, f, 3); for (let i = 0; i < 3; i++) { const t = (f + i * 16) % 48, x = 48 + t * 0.3, y = 40 - t * 0.4; if (t < 34) { shapes([rr(x, y, 5, 3, "#F3EAD2")]); P(x + 2, y + 1, "#A0281D"); } } },
    hat: (_f, b) => { cap("#2B4A8A", b, -11, -7); R(38, 19 + b, 10, 2, "#1E3560"); },
    outfit: (_f, b) => { for (let i = 0; i < 10; i++) P(37 - i, 38 + i + b, "#8A5A2B"); shapes([rr(21, 44 + b, 7, 6, "#8A5A2B")]); R(21, 46 + b, 7, 1, "#5A3E22"); },
  },
  survivor: {
    build: "wide", helm: "#AEB6C4", glow: "#F2C230", shirt: "#6F7A85", shade: "#505962", shoe: "#2B2B3A", screen: battery, back: deskBack,
    head: (f, b) => { rivets(f, b); P(32, 16 + b, OUT); R(36, 16 + b, 4, 2, "#8C97AA"); },
    hat: (_f, b) => { cap("#8C97AA", b, -12, -7); R(21, 19 + b, 23, 2, "#5A626F"); R(19, 17 + b, 3, 2, "#5A626F"); R(43, 17 + b, 3, 2, "#5A626F"); },
  },
  dawn_guard: {
    build: "wide", helm: "#AEB6C4", glow: "#FFE680", shirt: "#C9772E", shade: "#A05A1E", shoe: "#5A3E22", head: rivets, screen: battery,
    eye: (_f, b, g) => { R(26, 23 + b, 4, 4, g); R(35, 23 + b, 4, 4, g); P(28, 25 + b, "#0E1A2E"); P(37, 25 + b, "#0E1A2E"); },
    back: (f) => { const r = 26; for (let y = -r; y <= 0; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) P(32 + x, 52 + y, "#EE8A3C", 0.3); for (let i = 0; i < 9; i++) { const a = Math.PI + (i * Math.PI) / 8; P(32 + Math.cos(a) * (r + 3), 52 + Math.sin(a) * (r + 3), "#F2C230", (f + i * 5) % 24 < 16 ? 0.9 : 0.3); } },
    fx: (f, b) => { const s = Math.round(Math.sin((f * Math.PI) / 24) * 4); for (let i = 0; i < 12; i++) R(49 + i, 20 + b + (s * i) / 6 - i / 3, 1, 2 + i * 0.8, "#FFE680", 0.45 - i * 0.03); shapes([rr(43, 17 + b, 7, 6, "#5A626F")]); R(49, 18 + b, 1, 4, "#FFE680"); },
    hat: (_f, b) => { cap("#F2C230", b, -12, -7); R(20, 19 + b, 25, 2, "#C9A25B"); },
    outfit: (_f, b) => { R(22, 41 + b, 20, 2, "#F3EAD2"); R(22, 45 + b, 20, 1, "#F3EAD2"); },
    held: (f, b) => { shapes([rr(42, 41 + b, 5, 7, "#5A626F")]); R(43, 42 + b, 3, 5, f % 12 < 6 ? "#FFE680" : "#F2C230"); },
  },
  back_row: {
    build: "wide", noLegs: true, ghost: true, helm: "#B8BCCB", glow: "#6FE3F0", mouth: "o", shirt: "#4A4E63", shade: "#383B4C",
    screen: (f, b, g) => { for (let i = 0; i < 14; i++) P(25 + ((i * 37 + f * 5) % 15), 22 + ((i * 23 + f * 3) % 9) + b, g, 0.2); },
    eye: (_f, b, g) => { R(26, 26 + b, 4, 1, g); R(35, 26 + b, 4, 1, g); },
    back: () => shapes([rr(16, 4, 32, 4, "#8A5A2B"), rr(16, 8, 3, 47, "#8A5A2B"), rr(45, 8, 3, 47, "#8A5A2B"), rr(19, 20, 26, 3, "#5A3E22")]),
    fx: (f) => { for (let i = 0; i < 3; i++) { const t = (f + i * 16) % 48, x = 46 + t * 0.2, y = 26 - t * 0.45, o = 1 - t / 48; R(x, y, 3, 1, "#6FE3F0", o); P(x + 1, y + 1, "#6FE3F0", o); R(x, y + 2, 3, 1, "#6FE3F0", o); } },
  },
  necro: {
    build: "float", helm: "#4A3A66", glow: "#FF8FC8", shirt: "#4B2E6B", shade: "#35204C", screen: rune, back: grimoire,
    head: (_f, b) => dots([[25, 17], [26, 18], [26, 19], [27, 20], [40, 18]], b, OUT),
    hat: (_f, b) => { cap("#35204C", b, -13, -8); for (let i = 0; i < 8; i++) R(32 - (8 - i), 10 + b - i, (8 - i) * 2 + 1, 1, "#35204C"); P(30, 8 + b, "#F2C230"); P(35, 11 + b, "#F2C230"); },
    held: (_f, b) => shapes([rr(44, 24 + b, 2, 28, "#5A3E22")]),
  },
  night_lich: {
    build: "float", helm: "#D9D2BF", glow: "#6FE3F0", mouth: "fang", shirt: "#23193A", shade: "#160F26", screen: rune,
    head: (_f, b) => dots([[24, 18], [25, 19], [26, 20], [39, 17], [40, 18]], b, OUT),
    eye: (_f, b, g) => { R(27, 24 + b, 3, 3, g); R(36, 24 + b, 3, 3, g); P(28, 25 + b, "#FFFFFF"); P(37, 25 + b, "#FFFFFF"); },
    back: (f) => { disc(32, 27, 23, "#6FE3F0", 0.05); for (let a = 0; a < 6.28; a += 0.05) P(32 + Math.cos(a) * 25, 28 + Math.sin(a) * 25, "#7B5BD6", Math.floor((a + f * 0.1047) / 0.4) % 2 ? 0.65 : 0.15); cards(f, false); },
    fx: (f) => cards(f, true),
    hat: (_f, b) => { ([[24, 11], [29, 8], [34, 8], [39, 11]] as [number, number][]).forEach(([x, y]) => { shapes([rr(x, y + b, 3, 6, "#C9A25B")]); P(x + 1, y + 1 + b, "#6FE3F0"); }); R(24, 15 + b, 18, 2, "#C9A25B"); },
    held: (_f, b) => { shapes([rr(44, 20 + b, 2, 32, "#3A2A20"), rr(40, 12 + b, 10, 8, "#F3EAD2")]); R(41, 13 + b, 8, 1, "#5A3E22"); },
  },
  memory_shock: {
    build: "float", helm: "#B4CFC0", glow: "#86D99B", shirt: "#E8E4D8", shade: "#C7C2B2",
    head: (_f, b) => { R(22, 20 + b, 21, 1, OUT); for (let x = 24; x < 42; x += 4) R(x, 19 + b, 1, 3, "#AEB6C4"); },
    screen: (f, b, g) => { if (f % 12 < 7) ([[27, 1], [29, 3], [31, 2], [33, 4], [35, 2], [37, 3]] as [number, number][]).forEach(([x, h], i) => R(x, 23 + b + (i % 2) * h, 2, 1, g, 0.35)); },
    eye: (_f, b, g) => { R(26, 24 + b, 2, 2, g); R(35, 23 + b, 5, 5, g); R(36, 24 + b, 3, 3, "#0E1A2E"); P(37, 25 + b, g); },
    back: (f) => { const y = 26 + Math.round(Math.sin((f * Math.PI) / 24) * 2); shapes([rr(46, y, 11, 16, "#AFC9C4"), rr(45, y - 2, 13, 2, "#5A626F"), rr(45, y + 16, 13, 2, "#5A626F")]); disc(51, y + 7, 4, "#FF8FC8"); R(49, y + 6, 5, 1, "#C2588F"); P(52, y + 9, "#C2588F"); P(49, y + 14 - (f % 18) / 2, "#E8FFF6", 0.7); for (let i = 0; i < 6; i++) { const q = (f + i * 8) % 48; P(12 + ((i * 37) % 36), 50 - q * 0.8, "#86D99B", 1 - q / 48); } },
    hat: (f, b) => { R(31, 9 + b, 3, 6, "#8C97AA"); for (let y = 7; y < 15; y += 2) R(29, y + b, 7, 1, "#C9772E"); if (f % 12 < 5) dots([[33, 5], [35, 3], [33, 2], [36, 0], [29, 4], [27, 2], [29, 1]], b, "#86D99B"); },
    outfit: (_f, b) => { R(31, 41 + b, 3, 5, "#C7C2B2"); P(36, 43 + b, "#2E6B3F"); },
  },
};

/** วาด Pap-Boy 1 เฟรมลงกรอบ 64×64 ที่ (0,0) ของ ctx (ตั้ง translate ก่อนเรียก) */
export function drawPapBoy(ctx: CanvasRenderingContext2D, look: Look, f: number, withBg = false, pose: Pose = "palm") {
  c = ctx; st = look; art = artOf(look); A = 1;
  const t = f % 12 < 6 ? 0 : 1, b = art && pose === "palm" ? MOVE[art.build](f) : pose === "read" ? 2 : pose === "cheer" ? -2 * t : pose === "palm" ? t : 0;
  if (withBg) drawBg(f);
  drawBack(f); art?.back?.(f); drawWings(f, b); drawGround(f);
  A = art?.ghost ? 0.72 : 1; drawBody(f, b, pose); A = 1;
  art?.fx?.(f, b); drawFront(f);
  c.globalAlpha = 1;
}

/** sprite sheet แนวนอน FRAMES เฟรม × 64px · วาดครั้งเดียวต่อชุด (เว็บเท่านั้น) */
export function buildSheet(look: Look, withBg = false, pose: Pose = "palm"): HTMLCanvasElement {
  const sheet = document.createElement("canvas");
  sheet.width = 64 * FRAMES; sheet.height = 64;
  const ctx = sheet.getContext("2d")!;
  for (let f = 0; f < FRAMES; f++) { ctx.save(); ctx.translate(f * 64, 0); drawPapBoy(ctx, look, f, withBg, pose); ctx.restore(); }
  return sheet;
}
