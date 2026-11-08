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

/**
 * จัดรูปตอนพิมพ์: ผู้ใช้พิมพ์แค่ตัวเลข ตัวคั่นมาเอง · ไม่เติมตัวคั่นท้ายสุด (ลบถอยหลังได้ไม่ติด)
 * lens = ยาวสุดของแต่ละช่อง · oneDigitAbove = เลขตัวแรกมากกว่านี้ ช่องนั้นเต็มที่ 1 หลัก (เช่นวันที่ขึ้นต้น 8 = วันที่ 8)
 */
function mask(raw: string, sep: string, lens: number[], oneDigitAbove: number[]) {
  const parts = lens.map(() => "");
  let i = 0;
  const full = () => parts[i].length === lens[i] || (parts[i].length === 1 && +parts[i] > oneDigitAbove[i]);
  for (const c of raw) {
    if (/\d/.test(c)) {
      if (full()) {
        if (i === lens.length - 1) break;
        i++;
      }
      parts[i] += c;
    } else if (/[/:.-]/.test(c) && parts[i] && !full() && i < lens.length - 1) i++; // พิมพ์ตัวคั่นเองหลังเลขหลักเดียว เช่น 1/
  }
  return parts.slice(0, i + 1).join(sep);
}
export const maskDate = (raw: string) => mask(raw, "/", [2, 2, 4], [3, 1, Infinity]);
export const maskTime = (raw: string) => mask(raw, ":", [2, 2], [2, Infinity]);

export const DATE_ERR = "เช่น 08/11/2569";

/** "8/11/2569" (พ.ศ.) → "2026-11-08" · ไม่ใช่วันที่จริง หรือไม่ใช่ปี พ.ศ. = null */
export function fromThaiDate(s: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m || +m[3] < 2400 || +m[3] > 2700) return null;
  const iso = `${+m[3] - 543}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return isDate(iso) ? iso : null;
}

/** "2026-11-08" → "8/11/2569" (เติมฟอร์มแก้ไข) */
export const toThaiDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}/${m}/${y + 543}`;
};

/** ลิงก์ว่าง = null · ไม่มี http(s) = เติม https:// · อย่างอื่น (javascript: ฯลฯ) = ไม่รับ */
export function normUrl(s: string): string | null | undefined {
  const t = s.trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : "https://" + t;
  return /^https?:\/\/[^\s]+$/i.test(withScheme) ? withScheme : undefined; // undefined = ไม่ถูกต้อง
}

/** วันที่ + เวลา ตามเวลาไทย → ISO สำหรับ timestamptz */
export const bangkokIso = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();

/** ISO → { date: "YYYY-MM-DD", time: "HH:MM" } ตามเวลาไทย (กลับด้านของ bangkokIso ใช้เติมฟอร์มแก้ไข) */
export function bangkokParts(iso: string) {
  const t = new Date(Date.parse(iso) + 7 * 3600_000).toISOString(); // ไทยไม่มี DST
  return { date: t.slice(0, 10), time: t.slice(11, 16) };
}
