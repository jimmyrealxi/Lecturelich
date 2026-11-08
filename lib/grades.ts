// คำนวณคะแนนรวมและ "ปลายภาคต้องได้อย่างน้อยเท่าไหร่" — ไม่ผูกกับ UI (ขั้น 3)

export type Component = {
  name: string;
  weight: number; // % ของเกรด เช่น 30
  max: number; // คะแนนเต็มของส่วนนี้ เช่น 50
  score: number | null; // null = ยังไม่มีคะแนน
  isFinal?: boolean; // ส่วนที่จะคำนวณว่าต้องได้เท่าไหร่ (ปลายภาค)
};
export type Cutoffs = Record<string, number>; // เช่น { A: 80, "B+": 75, ... }

export const DEFAULT_CUTOFFS: Cutoffs = { A: 80, "B+": 75, B: 70, "C+": 65, C: 60, "D+": 55, D: 50 };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** คะแนนถ่วงน้ำหนัก (เต็ม = ผลรวม weight) จากส่วนที่มีคะแนนแล้ว */
export function weightedTotal(components: Component[]): number {
  return round2(
    components.reduce((sum, c) => (c.score == null || c.max <= 0 ? sum : sum + (c.score / c.max) * c.weight), 0),
  );
}

/** เกรดจากคะแนนรวม (ต่ำกว่าเกณฑ์ต่ำสุด = F) */
export function gradeFor(total: number, cutoffs: Cutoffs = DEFAULT_CUTOFFS): string {
  const sorted = Object.entries(cutoffs).sort((a, b) => b[1] - a[1]);
  return sorted.find(([, min]) => total >= min)?.[0] ?? "F";
}

/**
 * ปลายภาคต้องได้อย่างน้อยกี่คะแนน (หน่วยคะแนนดิบของปลายภาค) ถึงได้เกรดเป้าหมาย
 * ส่วนอื่นที่ยังไม่มีคะแนนนับเป็น 0 และบอกจำนวนไว้ใน unscoredOthers
 */
export function needOnFinal(components: Component[], target: string, cutoffs: Cutoffs = DEFAULT_CUTOFFS) {
  const final = components.find((c) => c.isFinal);
  const min = cutoffs[target];
  if (!final || min == null || final.weight <= 0 || final.max <= 0) return null;
  const others = components.filter((c) => c !== final);
  const current = weightedTotal(others);
  const raw = ((min - current) / final.weight) * final.max;
  const needed = Math.max(0, Math.ceil(raw * 100) / 100);
  return {
    needed, // 0 = ได้เกรดนี้แล้วแม้ปลายภาคได้ 0
    max: final.max,
    possible: needed <= final.max,
    unscoredOthers: others.filter((c) => c.score == null).length,
  };
}

export type ComponentRow = {
  name: string;
  weight: number;
  max_score: number;
  is_final: boolean;
  scores: { score: number; max_score: number }[];
};

/**
 * แถวจาก DB → Component · คิดตามสัดส่วนของรายการที่กรอกแล้ว: (ได้รวม / เต็มรวม) × คะแนนเต็มของส่วน
 * เช่น งาน 5 ชิ้น ชิ้นละ 10 ในส่วน 30 คะแนน → ได้ 45/50 = 27/30 (ไม่ต้องรู้ล่วงหน้าว่ามีกี่ชิ้น)
 * งานที่ยังไม่ได้กรอกไม่นับ (= เฉลี่ยจากที่มี) · ล้นเต็มได้แค่เต็ม · ยังไม่มีสักรายการ = null
 * Number(): numeric จาก PostgREST อาจมาเป็น string
 */
export function toComponents(rows: ComponentRow[]): Component[] {
  return rows.map((r) => {
    const max = Number(r.max_score);
    const got = r.scores.reduce((t, x) => t + Number(x.score), 0);
    const full = r.scores.reduce((t, x) => t + Number(x.max_score), 0);
    return {
      name: r.name,
      weight: Number(r.weight),
      max,
      score: full > 0 ? round2(Math.min(got / full, 1) * max) : null,
      isFinal: r.is_final,
    };
  });
}

/** เกณฑ์ต้องเป็นตัวเลข 0–100 และเรียงลดลงตามลำดับเกรด → คืนข้อความผิดพลาด หรือ null */
export function cutoffError(cutoffs: Cutoffs, order: string[] = Object.keys(DEFAULT_CUTOFFS)): string | null {
  let prev = Infinity;
  for (const g of order) {
    const v = cutoffs[g];
    if (!Number.isFinite(v) || v < 0 || v > 100) return `เกณฑ์ ${g} ต้องเป็นตัวเลข 0–100`;
    if (v >= prev) return `เกณฑ์ ${g} ต้องน้อยกว่าเกรดก่อนหน้า`;
    prev = v;
  }
  return null;
}
