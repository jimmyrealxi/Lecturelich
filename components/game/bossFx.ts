import type { Rarity } from "@/lib/papboy";

// เอฟเฟกต์ยิงในฉากบอส (docs/mockups/b10-class-skills.html) · ท่าตามคลาส × ช่วงเทอม · กระสุนตามอาวุธ · ความอลังการตามความหายาก · มีผลแค่หน้าตา
// สกิลและชื่อทั้งหมดคิดเอง ไม่อิงเกมใด

export const BOSS = { x: 98, y: 39 };
export const PB = { x: -6, y: 8 }; // มุมซ้ายบนของ Pap-Boy (กรอบ 64) ในฉาก
export const MZ = { x: PB.x + 51, y: PB.y + 38 }; // ปลายอาวุธในมือ

export const rect = (S: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string, a = 1) => {
  S.globalAlpha = a; S.fillStyle = col; S.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
export const circ = (S: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, a = 1) => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) rect(S, cx + x, cy + y, 1, 1, col, a);
};

// ปกติ = กระสุนเปล่า → magic หาง+แสงปลายอาวุธ → rare ใหญ่ ซ้อนนัด วงกระแทก → unique สามนัด ออร่า จอสะเทือน ไม้ตาย
export const POWER: Record<Rarity, { rank: number; trail: number; mul: number; scale: number; echo: number; flash: number; ring: number }> = {
  n: { rank: 0, trail: 1, mul: 0.5, scale: 1, echo: 0, flash: 0, ring: 0 },
  m: { rank: 1, trail: 3, mul: 1, scale: 1, echo: 0, flash: 2, ring: 0 },
  r: { rank: 2, trail: 6, mul: 1.6, scale: 2, echo: 1, flash: 4, ring: 1 },
  u: { rank: 3, trail: 9, mul: 2.4, scale: 2, echo: 2, flash: 7, ring: 2 },
};

export type ClassId = "scribe" | "deadline" | "survivor" | "necro";
// แรงกระแทกตามคลาส: หมึกร่วงหนัก · เศษพุ่งตรงเร็ว · ฝุ่นฟุ้งช้า · วิญญาณลอยขึ้น
export const PART: Record<ClassId, { g: number; v: number; up: number }> = {
  scribe: { g: 0.16, v: 1.3, up: 0.6 }, deadline: { g: 0, v: 2.6, up: 0 }, survivor: { g: -0.01, v: 0.5, up: 0.1 }, necro: { g: -0.06, v: 0.6, up: 0.3 },
};

export type Shot = { t: number; v: number; path: "line" | "wave" | "orbit"; arc: number; dmg: number; sx?: number; sy?: number; tx?: number; ty?: number; amp?: number; ph?: number; tag?: string };
export type FxState = { lock: number; beam: number; cone: number; rune: boolean; rings: { r: number; hit: boolean }[] };
type Ctl = { g: FxState; spawn: (o: Partial<Shot> & { dmg: number }) => void; impact: (n: number, dmg: number) => void };
type Stage = "start" | "mid" | "end";
const rnd = () => Math.random();

export const SKILLS: Record<ClassId, Record<Stage, { name: string; tick: (f: number, q: Ctl) => void }>> = {
  scribe: {
    start: { name: "จดเบา ๆ", tick: (f, q) => { if (f % 14 === 0) q.spawn({ arc: 8, dmg: 1 }); } },
    mid: { name: "สามบรรทัดรวด", tick: (f, q) => { if (f % 18 === 0) [-6, 0, 6].forEach((d, i) => q.spawn({ t: -i * 0.1, v: 0.09, sy: MZ.y + d, ty: d, dmg: 2 })); } },
    end: { name: "ถล่มทั้งสมุด", tick: (f, q) => { if (f % 4 === 0) { const x = 82 + rnd() * 30; q.spawn({ sx: x + 10, sy: -8, tx: x, ty: rnd() * 14 - 7, v: 0.1, dmg: 3 }); } } },
  },
  deadline: {
    start: { name: "นัดเดียวตรงเวลา", tick: (f, q) => { if (f % 18 === 0) q.spawn({ v: 0.16, dmg: 2 }); } },
    mid: { name: "นับถอยหลัง 3 2 1", tick: (f, q) => { if (f % 24 === 0) ["3", "2", "1"].forEach((tag, i) => q.spawn({ t: -i * 0.2, v: 0.13, tag, dmg: 2 })); } },
    end: { name: "นาทีสุดท้าย", tick: (f, q) => { const p = f % 34; q.g.lock = p < 22 ? p + 1 : 0; if (p === 22) { q.g.beam = 5; q.impact(10, 9); } } },
  },
  survivor: {
    start: { name: "เช็กชื่อ", tick: (f, q) => { if (f % 14 === 0) q.spawn({ arc: 16, dmg: 1 }); } },
    mid: { name: "กริ่งเข้าแถว", tick: (f, q) => { if (f % 20 === 0) { q.g.rings.push({ r: 2, hit: false }); q.spawn({ arc: 6, dmg: 1 }); } } },
    end: { name: "เปิดไฟทั้งห้อง", tick: (f, q) => { if (f % 40 === 0) q.g.cone = 20; if (q.g.cone > 0 && q.g.cone % 3 === 0) q.impact(4, 3); if (f % 14 === 0) q.spawn({ arc: 12, dmg: 2 }); } },
  },
  necro: {
    start: { name: "ปลุกบัตรคำ", tick: (f, q) => { if (f % 16 === 0) q.spawn({ path: "wave", amp: 6, dmg: 1, ph: rnd() * 6 }); } },
    mid: { name: "ฝูงบัตรทวน", tick: (f, q) => { if (f % 34 === 0) for (let i = 0; i < 6; i++) q.spawn({ path: "orbit", ph: (i / 6) * 6.28, v: 0.032, dmg: 2 }); } },
    end: { name: "ความรู้คืนชีพ", tick: (f, q) => { q.g.rune = true; if (f % 7 === 0) q.spawn({ sx: 46 + rnd() * 34, sy: 63, arc: 22, v: 0.06, dmg: 3 }); } },
  },
};

export function shotPos(s: Shot, t: number): readonly [number, number] {
  const k = Math.max(0, Math.min(1, t));
  const sx = s.sx ?? MZ.x, sy = s.sy ?? MZ.y, tx = s.tx ?? BOSS.x - 6, ty = BOSS.y + (s.ty ?? 0);
  if (s.path === "orbit") {
    const cx = MZ.x + 10, cy = MZ.y - 8, ph = s.ph ?? 0;
    if (k < 0.45) { const a = ph + (k / 0.45) * 6.28; return [cx + Math.cos(a) * 14, cy + Math.sin(a) * 9]; }
    const u = (k - 0.45) / 0.55, ox = cx + Math.cos(ph) * 14, oy = cy + Math.sin(ph) * 9;
    return [ox + (tx - ox) * u, oy + (ty - oy) * u];
  }
  const y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * s.arc;
  return [sx + (tx - sx) * k, s.path === "wave" ? y + Math.sin(k * 12 + (s.ph ?? 0)) * (s.amp ?? 0) * (1 - k * 0.5) : y];
}

/** กระสุนของอาวุธแต่ละชิ้น · (x, y) = กลางกระสุน หันไปทางบอส */
export function drawBullet(S: CanvasRenderingContext2D, id: string, x: number, y: number, f: number, col: string) {
  const w = f % 4 < 2 ? 0 : 1;
  switch (id) {
    case "pen": circ(S, x, y, 1, col); rect(S, x, y, 1, 1, "#FFFFFF"); rect(S, x - 2, y, 1, 1, col, 0.7); break;
    case "whiteout": rect(S, x - 6, y, 9, 2, "#F3F5F8"); rect(S, x - 7, y, 1, 2, col, 0.7); break;
    case "stamp": rect(S, x - 1, y - 4, 3, 3, "#5A3E22"); rect(S, x - 3, y - 1, 7, 2, "#2A211B"); rect(S, x - 3, y + 1, 7, 1, "#C2372C"); break;
    case "pencil": rect(S, x - 5, y, 7, 2, "#F2C230"); rect(S, x - 6, y, 1, 2, "#FF8FC8"); rect(S, x + 2, y, 1, 2, "#E6DCC4"); rect(S, x + 3, y, 1, 1, "#2A211B"); break;
    case "laser": rect(S, x - 9, y - 1, 11, 3, "#FF5A5A", 0.3); rect(S, x - 9, y, 11, 1, "#FF5A5A"); rect(S, x - 4, y, 6, 1, "#FFFFFF"); break;
    case "hand": rect(S, x - 6, y - 1, 2, 3, "#AEB6C4"); rect(S, x - 5, y, 8, 1, "#E8E8E8"); rect(S, x + 3, y, 2, 1, col); break;
    case "rubber": rect(S, x - 5, y - 1, 9, 1, "#C9772E"); rect(S, x - 5, y + 1, 9, 1, "#C9772E"); rect(S, x + 4, y, 1, 1, "#C9772E"); rect(S, x - 6, y, 1, 1, "#C9772E"); break;
    case "calendar": rect(S, x - 3, y - 4 + w, 7, 9, "#F3EAD2"); rect(S, x - 3, y - 4 + w, 7, 2, "#C2372C"); rect(S, x - 1, y + w, 3, 3, "#2A211B"); break;
    case "stapler": rect(S, x, y - 2, 1, 5, "#DDE3EC"); rect(S, x - 2, y - 2, 2, 1, "#DDE3EC"); rect(S, x - 2, y + 2, 2, 1, "#DDE3EC"); break;
    case "alarm": { circ(S, x, y, 3, "#C2372C"); circ(S, x, y, 2, "#F3EAD2"); rect(S, x, y - 1, 1, 2, "#2A211B"); const o = w ? 6 : 5; rect(S, x + o, y - 2, 1, 5, col, 0.7); rect(S, x - o, y - 2, 1, 5, col, 0.7); break; }
    case "eraser": rect(S, x - 2, y - 2, 5, 3, "#8A5A2B"); rect(S, x - 2, y + 1, 5, 1, "#F3EAD2"); rect(S, x - 4, y + (f % 2), 1, 1, "#F3EAD2", 0.7); break;
    case "bottle": rect(S, x - 3, y - 1, 6, 3, "#5A626F"); rect(S, x - 2, y - 1, 4, 1, "#AEB6C4"); break;
    case "whistle": for (let i = 1; i <= 3; i++) rect(S, x - i * 3, y - 2, 1, 5, col, 0.9 - i * 0.25); rect(S, x, y - 1, 3, 3, "#AEB6C4"); break;
    case "torch": circ(S, x, y, 4, "#FFE680", 0.22); circ(S, x, y, 2, "#FFE680", 0.9); rect(S, x, y, 1, 1, "#FFFFFF"); break;
    case "bell": rect(S, x - 1 + w, y - 3, 3, 1, "#F2C230"); rect(S, x - 2 + w, y - 2, 5, 3, "#F2C230"); rect(S, x - 3 + w, y + 1, 7, 1, "#C9A25B"); rect(S, x + w, y + 2, 1, 1, "#C2372C"); break;
    case "card": rect(S, x - 2, y - 3, 5, 7, "#2A211B"); rect(S, x - 1, y - 2, 3, 5, "#F3EAD2"); rect(S, x, y - 1, 2, 1, col); break;
    case "highlighter": rect(S, x - 8, y - 1, 11, 3, "#FFE680", 0.55); rect(S, x + 3, y - 1, 2, 3, "#86D99B"); break;
    case "sticky": rect(S, x - 3, y - 3 + w, 7, 7, "#F2C230"); rect(S, x + 2, y + 2 + w, 2, 2, "#C9A25B"); rect(S, x - 2, y - 1 + w, 5, 1, "#8A5A2B"); break;
    case "ruler": if (w) { rect(S, x, y - 5, 2, 11, "#C9A25B"); rect(S, x, y - 2, 1, 1, "#5A3E22"); } else { rect(S, x - 5, y, 11, 2, "#C9A25B"); rect(S, x - 3, y, 1, 1, "#5A3E22"); rect(S, x + 1, y, 1, 1, "#5A3E22"); } break;
    case "sheet": rect(S, x - 4, y - 5, 9, 11, col, 0.3); rect(S, x - 3, y - 4, 7, 9, "#F3EAD2"); for (let i = 0; i < 4; i++) rect(S, x - 2, y - 3 + i * 2, 5, 1, "#9C8E7A"); break;
  }
}
