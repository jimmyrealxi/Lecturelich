// ตรวจค่าที่ผู้ใช้พิมพ์ (วันที่ / เวลา / ลิงก์) ก่อนส่งเข้าฐานข้อมูล

/** "YYYY-MM-DD" ที่มีอยู่จริงในปฏิทิน */
export function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** "H:MM" หรือ "HH:MM" 00:00–23:59 → คืน "HH:MM" หรือ null */
export function normTime(s: string): string | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(s.trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return m[1].padStart(2, "0") + ":" + m[2];
}

/** ลิงก์ว่าง = null · ไม่มี http(s) = เติม https:// · อย่างอื่น (javascript: ฯลฯ) = ไม่รับ */
export function normUrl(s: string): string | null | undefined {
  const t = s.trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : "https://" + t;
  return /^https?:\/\/[^\s]+$/i.test(withScheme) ? withScheme : undefined; // undefined = ไม่ถูกต้อง
}

/** วันที่ + เวลา ตามเวลาไทย → ISO สำหรับ timestamptz */
export const bangkokIso = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();
