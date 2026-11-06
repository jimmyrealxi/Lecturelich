// แสดงวันเวลาแบบไทย (ตาม Asia/Bangkok)
const TZ = "Asia/Bangkok";

export const hhmm = (t: string) => t.slice(0, 5);

export const thaiDate = (date: string) =>
  new Date(date + "T00:00:00+07:00").toLocaleDateString("th-TH", {
    timeZone: TZ, weekday: "long", day: "numeric", month: "short",
  });

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
