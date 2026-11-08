// บอสประจำเทอม (ฉากสู้บนสุดหน้าเกม) — ไม่ผูกกับ UI
// ⚠ สูตรเลือดยังรอเจ้าของยืนยัน (ข้อเสนอใน docs/LOOT_PLAN.md): HP = XP ที่คาดว่าได้ทั้งเทอม · ลดตาม XP จริงของเทอม
//   ไม่ถึง 0 ก่อนวันสอบปลายภาควิชาสุดท้าย · ตายในวันนั้น · เปลี่ยนตัวเลขที่ BOSS_CONFIG ที่เดียว

export const BOSS_CONFIG = {
  expectedXpPerDay: 50, // XP ที่คาดว่าได้ต่อวัน (≈ กล่องเหล็กวันละใบ) × จำนวนวันเปิดเทอมถึงวันสอบสุดท้าย = เลือดเต็ม
  minHpBeforeEnd: 0.01, // ยังไม่ถึงวันสอบสุดท้าย เลือดเหลืออย่างน้อย 1%
} as const;

export type BossStage = "start" | "mid" | "end" | "dead";
const DAY = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/**
 * @param start วันเปิดเทอม · @param lastExam วันสอบปลายภาควิชาสุดท้าย (ไม่มี = วันปิดเทอม)
 * @param midterm วันสอบกลางภาควิชาสุดท้าย (ขีดเฟส 2) · @param termXp XP รวมของวิชาในเทอมนี้
 * วันที่แบบ YYYY-MM-DD ตามเวลาไทย
 */
export function termBoss(o: { start: string; lastExam: string; midterm: string | null; today: string; termXp: number }) {
  const total = Math.max(1, days(o.start, o.lastExam) + 1);
  const maxHp = total * BOSS_CONFIG.expectedXpPerDay;
  const dead = o.today >= o.lastExam;
  const hp = dead ? 0 : Math.max(Math.ceil(maxHp * BOSS_CONFIG.minHpBeforeEnd), Math.min(maxHp, maxHp - Math.max(0, o.termXp)));
  const progress = clamp(days(o.start, o.today) / total);
  const stage: BossStage = dead ? "dead" : progress < 1 / 3 ? "start" : progress < 2 / 3 ? "mid" : "end";
  // ขีดบนแถบเลือด = เลือดที่ควรเหลือหลังสอบกลางภาคถ้าได้ XP ตามคาด
  const phase = o.midterm && o.midterm > o.start && o.midterm < o.lastExam ? 1 - clamp((days(o.start, o.midterm) + 1) / total) : null;
  return { maxHp, hp, pct: hp / maxHp, stage, phase, dead };
}
