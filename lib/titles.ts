import type { Rarity } from "./papboy.ts";

// ฉายาจากความสำเร็จ (docs/mockups/b7-titles.html) · need ต้องตรงกับ _title_progress() ใน migration 7c (มีเทสต์เทียบ)
export const TITLES: { id: string; name: string; r: Rarity; need: number; cond: string }[] = [
  { id: "start", name: "นักเรียนฝึกหัด", r: "n", need: 1, cond: "ตั้งต้น" },
  { id: "attend10", name: "ตรงเวลาเข้าเรียน", r: "m", need: 10, cond: "เข้าเรียนครบ 10 คาบ" },
  { id: "attend50", name: "เจ้าของเก้าอี้แถวหน้า", r: "r", need: 50, cond: "เข้าเรียนครบ 50 คาบ" },
  { id: "note30", name: "มือไม่วางปากกา", r: "m", need: 30, cond: "จดหลังคาบครบ 30 ครั้ง" },
  { id: "photo20", name: "จดจนกล้องร้อน", r: "r", need: 20, cond: "จดมีรูปครบ 20 ครั้ง" },
  { id: "early10", name: "ส่งก่อนเดดไลน์จะตื่น", r: "r", need: 10, cond: "ส่งก่อนกำหนด 10 งาน" },
  { id: "review50", name: "ผู้กลับมาทวน", r: "r", need: 50, cond: "ทวนครบ 50 ครั้ง" },
  { id: "boss1", name: "ผู้ล้มกองข้อสอบ", r: "u", need: 1, cond: "ล้มบอสประจำเทอม" },
];
