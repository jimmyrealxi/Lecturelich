// คำนวณคาบเรียนจากช่วงเวลาซ้ำทุกสัปดาห์ (class_slots) + ช่วงเทอม — ไม่ผูกกับ UI · เวลาอิง Asia/Bangkok (UTC+7 ไม่มี DST)

export type Slot = {
  id: string;
  subject_id: string;
  weekday: number; // 0 = อาทิตย์ … 6 = เสาร์
  start_time: string; // "HH:MM" หรือ "HH:MM:SS" (Postgres time)
  end_time: string;
  room: string | null;
  makeup_date?: string | null; // มีค่า = คาบชดเชยครั้งเดียววันนั้น · ไม่มี = ซ้ำทุกสัปดาห์
};
export type Term = { start_date: string; end_date: string }; // "YYYY-MM-DD"
export type AttendanceStatus = "present" | "absent" | "no_class";
export type ClassState = "upcoming" | "live" | "ended";

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** วันที่ วันในสัปดาห์ และนาทีของวัน ตามเวลาไทย */
export function bangkokNow(now: Date = new Date()) {
  const d = new Date(now.getTime() + BKK_OFFSET_MS);
  return {
    date: d.toISOString().slice(0, 10),
    weekday: d.getUTCDay(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function inTerm(date: string, term: Term): boolean {
  return date >= term.start_date && date <= term.end_date;
}

export function weekdayOf(date: string): number {
  return new Date(date + "T00:00:00Z").getUTCDay();
}

/** คาบของวันหนึ่ง เรียงตามเวลาเริ่ม (นอกช่วงเทอม = ไม่มีคาบ) */
export function slotsOn(date: string, slots: Slot[], term: Term | null): Slot[] {
  if (!term || !inTerm(date, term)) return [];
  const wd = weekdayOf(date);
  return slots
    .filter((s) => (s.makeup_date ? s.makeup_date === date : s.weekday === wd))
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
}

/** วันคาบถัดไปของวิชาหลังวันที่ after (ไม่นับวันนั้น · หาไม่เกิน 3 สัปดาห์ · ไม่เจอ = null) */
export function nextClassDate(after: string, subjectId: string, slots: Slot[], term: Term | null): string | null {
  const mine = slots.filter((s) => s.subject_id === subjectId);
  for (let i = 1; i <= 21; i++) {
    const d = new Date(Date.parse(after + "T00:00:00Z") + i * 86_400_000).toISOString().slice(0, 10);
    if (slotsOn(d, mine, term).length) return d;
  }
  return null;
}

export function classState(slot: Slot, minutes: number): ClassState {
  if (minutes < toMinutes(slot.start_time)) return "upcoming";
  if (minutes < toMinutes(slot.end_time)) return "live";
  return "ended";
}

/** คาบที่กำลังเรียน ถ้าไม่มีก็คาบถัดไปของวันนี้ */
export function currentOrNext(today: Slot[], minutes: number): { slot: Slot; state: ClassState } | null {
  for (const slot of today) {
    const state = classState(slot, minutes);
    if (state !== "ended") return { slot, state };
  }
  return null;
}

/** คาบที่จบแล้ววันนี้แต่ยังไม่ได้จด (คาบที่ "ไม่มีเรียน" ไม่ต้องเตือน) */
export function endedWithoutNote(
  today: Slot[],
  minutes: number,
  notedSlotIds: Set<string>,
  status: Map<string, AttendanceStatus>,
): Slot[] {
  return today.filter(
    (s) => classState(s, minutes) === "ended" && !notedSlotIds.has(s.id) && status.get(s.id) !== "no_class",
  );
}

/** จำนวนคาบทั้งเทอมของวิชาหนึ่ง (นับจาก slots ของวิชานั้น · คาบชดเชยนับครั้งเดียว) */
export function countSessions(subjectSlots: Slot[], term: Term): number {
  const perWeekday = new Array(7).fill(0);
  let n = 0;
  for (const s of subjectSlots) {
    if (!s.makeup_date) perWeekday[s.weekday]++;
    else if (inTerm(s.makeup_date, term)) n++;
  }
  const end = Date.parse(term.end_date + "T00:00:00Z");
  for (let t = Date.parse(term.start_date + "T00:00:00Z"); t <= end; t += DAY_MS) {
    n += perWeekday[new Date(t).getUTCDay()];
  }
  return n;
}

/** งานขึ้นจอเขียวแท็บงาน: เลยกำหนดนานสุด หรือใกล้ส่งสุดภายใน 3 วัน (กำหนดเก่าสุดมาก่อนจึงครอบทั้งสองกรณี) */
export function urgentTask<T extends { done: boolean; due_at: string | null }>(tasks: T[], today: string): T | null {
  const limit = Date.parse(today + "T23:59:59+07:00") + 3 * DAY_MS;
  return tasks
    .filter((a) => !a.done && a.due_at && Date.parse(a.due_at) <= limit)
    .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!))[0] ?? null;
}

/** วิชาขึ้นจอเขียวแท็บวิชา: ขาดแล้วและขาดได้อีกไม่เกิน 1 ครั้ง · เหลือน้อยสุดมาก่อน */
export function attendanceRisk<T extends { stats: { absent: number; remaining: number } | null }>(rows: T[]): T | null {
  return rows
    .filter((r) => r.stats && r.stats.absent > 0 && r.stats.remaining <= 1)
    .sort((a, b) => a.stats!.remaining - b.stats!.remaining)[0] ?? null;
}

/**
 * สถิติเข้าเรียน · คาบ "ไม่มีเรียน" ไม่นับทั้งในตัวหารและเกณฑ์
 * maxAbsent = ขาดได้มากสุดทั้งเทอมโดยยังผ่านเกณฑ์ minPct
 */
export function attendanceStats(statuses: AttendanceStatus[], totalSessions: number, minPct = 80) {
  const present = statuses.filter((s) => s === "present").length;
  const absent = statuses.filter((s) => s === "absent").length;
  const noClass = statuses.filter((s) => s === "no_class").length;
  const counted = Math.max(totalSessions - noClass, 0);
  const maxAbsent = Math.floor((counted * (100 - minPct)) / 100);
  const recorded = present + absent;
  return {
    present,
    absent,
    pct: recorded === 0 ? 100 : Math.round((present / recorded) * 100),
    maxAbsent,
    remaining: maxAbsent - absent, // ติดลบ = เกินเกณฑ์แล้ว
    warn: maxAbsent - absent <= 1,
  };
}
