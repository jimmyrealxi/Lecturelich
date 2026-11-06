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
