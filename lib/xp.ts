// XP และเลเวล (ขั้น 4) — ค่า XP ทั้งหมดอยู่ที่ XP_CONFIG ที่เดียว · ฝั่ง DB (xp_events + RPC) ต้องใช้ค่าชุดเดียวกัน

export const XP_CONFIG = {
  attend: 5, // มาเรียน
  note: 10, // จดหลังคาบ
  notePhoto: 5, // โบนัสถ้ามีรูป
  submitEarly: 20, // ส่งก่อนกำหนด ≥ 1 วัน
  submitOnTime: 10,
  review: 3, // ตอบคำถามทวนถูก / ทวนหัวข้อ
  reviewDailyCap: 30,
  start5: 5, // อ่านครบรอบ "เริ่ม 5 นาที"
  // shortcut: แผนบอกแค่ "มีเพดานต่อวัน" ไม่ได้บอกตัวเลข — ตั้ง 60 ไว้ก่อน ถามเจ้าของก่อนทำขั้น 4
  dailyCapPerSubject: 60,
  levelStep: 50, // XP ขึ้นเลเวลถัดไป = levelStep × เลเวลปัจจุบัน
} as const;

/** เลเวลจาก XP สะสม (เริ่ม LV 1) · into/need = ความคืบหน้าในเลเวลปัจจุบัน */
export function levelFromXp(xp: number) {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= XP_CONFIG.levelStep * level) {
    rest -= XP_CONFIG.levelStep * level;
    level++;
  }
  return { level, into: rest, need: XP_CONFIG.levelStep * level };
}

/** XP จากการส่งงาน: ก่อนกำหนด ≥ 24 ชม. / ตรงเวลา / เลยกำหนด = 0 */
export function submitXp(dueAt: string | null, submittedAt: string): number {
  if (!dueAt) return XP_CONFIG.submitOnTime;
  const early = Date.parse(dueAt) - Date.parse(submittedAt);
  if (early >= 24 * 3600_000) return XP_CONFIG.submitEarly;
  return early >= 0 ? XP_CONFIG.submitOnTime : 0;
}

/**
 * XP ที่ได้จริงหลังหักเพดาน
 * @param earnedToday XP ของวิชานี้ที่ได้ไปแล้ววันนี้
 * @param reviewToday XP จากการทวนของวิชานี้ที่ได้ไปแล้ววันนี้ (ใช้เมื่อ isReview)
 */
export function grantXp(amount: number, earnedToday: number, reviewToday = 0, isReview = false): number {
  let room = XP_CONFIG.dailyCapPerSubject - earnedToday;
  if (isReview) room = Math.min(room, XP_CONFIG.reviewDailyCap - reviewToday);
  return Math.max(0, Math.min(amount, room));
}
