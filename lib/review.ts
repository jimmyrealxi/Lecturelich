// ทวนแบบเว้นระยะ + เลือดบอส + สถานะโหนด passive tree (ขั้น 5) — ไม่ผูกกับ UI

export const REVIEW_DAYS = [1, 3, 7, 14] as const; // รอบทวน
export const STAR_WEIGHT = 2; // หัวข้อ ⭐ นับเลือดบอสกี่เท่า

export type Topic = {
  id: string;
  is_starred: boolean;
  review_stage: number; // ทวนไปแล้วกี่รอบ (0 = ยังไม่ทวน)
  next_review_at: string | null; // ISO
};
export type NodeState = "dark" | "lit" | "fading"; // ยังไม่ทวน / ทวนแล้วยังอยู่ในรอบ / เลยรอบ

const DAY_MS = 86_400_000;

/** หลังทวน 1 ครั้ง: รอบถัดไป (รอบสุดท้ายวนที่ 14 วัน) */
export function afterReview(stage: number, reviewedAt: Date) {
  const days = REVIEW_DAYS[Math.min(stage, REVIEW_DAYS.length - 1)];
  return { review_stage: stage + 1, last_reviewed_at: reviewedAt.toISOString(), next_review_at: new Date(reviewedAt.getTime() + days * DAY_MS).toISOString() };
}

export function nodeState(t: Topic, now: Date = new Date()): NodeState {
  if (t.review_stage === 0 || !t.next_review_at) return "dark";
  return now.getTime() > Date.parse(t.next_review_at) ? "fading" : "lit";
}

/** ทวนครบทุกรอบแล้วและยังไม่เลยรอบ = หัวข้อความหายาก unique */
export const isMastered = (t: Topic, now?: Date) => t.review_stage >= REVIEW_DAYS.length && nodeState(t, now) === "lit";

/**
 * เลือดบอส = น้ำหนักหัวข้อที่ยังไม่ "lit" (ไม่เคยทวน หรือเลยรอบ → บอสฟื้นเลือด)
 * ready = % พร้อมสอบ · missing เรียง ⭐ ก่อน
 */
export function bossStatus<T extends Topic>(topics: T[], now: Date = new Date()) {
  const w = (t: T) => (t.is_starred ? STAR_WEIGHT : 1);
  const maxHp = topics.reduce((s, t) => s + w(t), 0);
  const missing = topics.filter((t) => nodeState(t, now) !== "lit");
  const hp = missing.reduce((s, t) => s + w(t), 0);
  return {
    hp,
    maxHp,
    ready: maxHp === 0 ? 0 : Math.round(((maxHp - hp) / maxHp) * 100),
    missing: [...missing].sort((a, b) => Number(b.is_starred) - Number(a.is_starred)),
  };
}

export type ExamKind = "midterm" | "final";
export type ExamRow = { subject_id: string; kind: ExamKind; date: string }; // date = "YYYY-MM-DD"

/**
 * หัวข้อเข้าบอสตัวไหน: ติดป้ายกลาง/ปลายภาคไว้ใช้ป้าย · ไม่ติดป้าย = ดูวันที่จดเทียบวันสอบกลางภาค
 * (จดก่อนหรือวันสอบกลางภาค = กลางภาค · หลังจากนั้นหรือยังไม่ตั้งวันสอบกลางภาค = ปลายภาค)
 */
export function examOf(tag: ExamKind | null, noteDate: string | null, midtermDate: string | null): ExamKind {
  if (tag) return tag;
  return midtermDate && noteDate && noteDate <= midtermDate ? "midterm" : "final";
}

/** จำนวนวันจาก today ถึงวันสอบ (วันที่แบบ YYYY-MM-DD) */
export const daysUntil = (date: string, today: string) => Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS);

/** บอสที่ยังไม่ผ่าน (สอบวันนี้หรือหลังจากนี้) เรียงจากใกล้สุด */
export const upcomingExams = <E extends ExamRow>(exams: E[], today: string) =>
  exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
