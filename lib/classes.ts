/** คลาสกับสายย่อย · มีผลแค่หน้าตา ไม่แตะ XP เกรด คะแนนห้อง
 *  เพิ่มคลาสใหม่ = เพิ่มที่นี่ + ร่างใน CLASS_ART (lib/papboy.ts) + class_ascs() ใน migration ใหม่ (มีเทสต์เทียบรหัส) */
export const CLASSES = [
  { id: "scribe", name: "นักจดซาก", vibe: "สายจด เก็บทุกอย่างที่เหลือรอด", weapons: ["pen", "whiteout", "stamp", "pencil", "laser"], asc: [
    { id: "wild_scribe", name: "อาลักษณ์เถื่อน", desc: "หนังสือยักษ์กางบนหลัง ตาเป็นเคอร์เซอร์พิมพ์ ชายเสื้อหมึกหยด" },
    { id: "board_decoder", name: "นักถอดรหัสกระดาน", desc: "แบกกระดานดำเต็มหลัง ตาข้างเดียวเป็นแว่นขยายใหญ่" },
  ] },
  { id: "deadline", name: "นักล่าเดดไลน์", vibe: "สายส่งงาน นับถอยหลังเป็นงานอดิเรก", weapons: ["hand", "rubber", "calendar", "stapler", "alarm"], asc: [
    { id: "last_minute", name: "มือปืนนาทีสุดท้าย", desc: "ผ้าคลุมปลิวข้างหลัง วงเล็งหมุนหลังหัว ตาเล็งผ่านศูนย์เล็ง" },
    { id: "early_courier", name: "ผู้ส่งล่วงหน้า", desc: "เงาค้างตามหลังเพราะวิ่งเร็ว นาฬิกามีปีก ตาเป็นลูกศร" },
  ] },
  { id: "survivor", name: "ผู้รอดหน้าห้อง", vibe: "สายเข้าเรียน มาก่อนใคร กลับหลังใคร", weapons: ["eraser", "bottle", "whistle", "torch", "bell"], asc: [
    { id: "dawn_guard", name: "ยามคาบเช้า", desc: "ไฟฉายยักษ์บนไหล่ พระอาทิตย์ขึ้นหลังตัว ตาเบิกโพลง" },
    { id: "back_row", name: "เจ้าที่หลังห้อง", desc: "ผีโปร่งไม่มีขา ลอยติดเก้าอี้แถวสุดท้าย หลับตลอดคาบ" },
  ] },
  { id: "necro", name: "หมอผีทวน", vibe: "สายทวน ปลุกความรู้ที่ตายไปแล้ว", weapons: ["card", "highlighter", "sticky", "ruler", "sheet"], asc: [
    { id: "night_lich", name: "ลิชคืนก่อนสอบ", desc: "ตายไปแล้วรอบหนึ่งแต่ยังอ่านไม่จบ บัตรคำหมุนรอบตัว" },
    { id: "memory_shock", name: "ผู้ปลุกความจำ", desc: "หัวเย็บแม็กต่อกัน โหลสมองลอยข้างตัว ไฟช็อตวิ่งบนจอ" },
  ] },
] as const;

export const classById = (id?: string | null) => CLASSES.find((k) => k.id === id);
export const ascById = (id?: string | null) => CLASSES.flatMap((k) => [...k.asc]).find((a) => a.id === id);
/** อาวุธนี้เป็นของคลาสไหน (ค่าของช่อง held) */
export const weaponClass = (v: string) => CLASSES.find((k) => (k.weapons as readonly string[]).includes(v))?.id;
/** ของชิ้นนี้ใช้กับคลาสนี้ได้ไหม · อาวุธแยกตามคลาส ของอื่นใช้ได้หมด */
export const fitsClass = (it: { k: string; v: string; isDefault: boolean }, cls?: string | null) => it.k !== "held" || it.isDefault || weaponClass(it.v) === cls;
