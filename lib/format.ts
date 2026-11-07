// แสดงวันเวลาแบบไทย (ตาม Asia/Bangkok)
const TZ = "Asia/Bangkok";

export const hhmm = (t: string) => t.slice(0, 5);

const WD = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const WD_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const ymd = (date: string) => new Date(date + "T00:00:00Z");

/** "เสาร์ 7 พ.ย." (date = YYYY-MM-DD ตามเวลาไทย) */
export const thaiDate = (date: string) => {
  const d = ymd(date);
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
};

/** หัวหน้าวันนี้: "วันเสาร์" + "07 พ.ย. 2569" (พ.ศ. แบบพิมพ์ดีด) */
export const weekdayName = (date: string) => "วัน" + WD[ymd(date).getUTCDay()];
export const typedDate = (date: string) => {
  const d = ymd(date);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
};

/** "อ. 11 พ.ย." */
export const shortDate = (date: string) => {
  const d = ymd(date);
  return `${WD_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
};

/** นาที → "1:46" */
export const dur = (min: number) => `${Math.floor(min / 60)}:${String(Math.max(0, min) % 60).padStart(2, "0")}`;

/** กำหนดส่งแยกส่วน: day = "วันนี้"/"พรุ่งนี้"/"อ. 11 พ.ย."/"เลยกำหนด" · time = "23:59" (เวลาไทย) · days = อีกกี่วัน */
export function dueInfo(dueAt: string, todayDate: string) {
  const bkk = new Date(Date.parse(dueAt) + 7 * 3600_000).toISOString(); // Asia/Bangkok ไม่มีเวลาออมแสง
  const date = bkk.slice(0, 10);
  const days = Math.round((Date.parse(date) - Date.parse(todayDate)) / 86_400_000);
  const day = days < 0 ? "เลยกำหนด" : days === 0 ? "วันนี้" : days === 1 ? "พรุ่งนี้" : shortDate(date);
  return { day, time: bkk.slice(11, 16), days };
}

/** กำหนดส่งแบบสั้น: "วันนี้ 23:59" / "พรุ่งนี้ 23:59" / "พฤ. 12 พ.ย." */
export function dueLabel(dueAt: string, todayDate: string): string {
  const d = new Date(dueAt);
  const date = d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
  const time = d.toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const diff = Math.round((Date.parse(date) - Date.parse(todayDate)) / 86_400_000);
  if (diff < 0) return "เลยกำหนด";
  if (diff === 0) return "วันนี้ " + time;
  if (diff === 1) return "พรุ่งนี้ " + time;
  return d.toLocaleDateString("th-TH", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
}

/** เหลือไม่เกิน 1 วัน = แสดงสีเตือน */
export const isDueSoon = (dueAt: string, now = Date.now()) => Date.parse(dueAt) - now < 36 * 3600_000;
