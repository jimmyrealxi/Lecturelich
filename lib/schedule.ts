// คำนวณคาบเรียนจากช่วงเวลาซ้ำทุกสัปดาห์ (class_slots) + ช่วงเทอม — ไม่ผูกกับ UI · เวลาอิง Asia/Bangkok (UTC+7 ไม่มี DST)

export type Slot = {
  id: string;
  subject_id: string;
  weekday: number; // 0 = อาทิตย์ … 6 = เสาร์
  start_time: string; // "HH:MM" หรือ "HH:MM:SS" (Postgres time)
  end_time: string;
  room: string | null;
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

function weekdayOf(date: string): number {
  return new Date(date + "T00:00:00Z").getUTCDay();
}

/** คาบของวันหนึ่ง เรียงตามเวลาเริ่ม (นอกช่วงเทอม = ไม่มีคาบ) */
export function slotsOn(date: string, slots: Slot[], term: Term | null): Slot[] {
  if (!term || !inTerm(date, term)) return [];
  const wd = weekdayOf(date);
  return slots
    .filter((s) => s.weekday === wd)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
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

/** จำนวนคาบทั้งเทอมของวิชาหนึ่ง (นับจาก slots ของวิชานั้น) */
export function countSessions(subjectSlots: Slot[], term: Term): number {
  const perWeekday = new Array(7).fill(0);
  for (const s of subjectSlots) perWeekday[s.weekday]++;
  let n = 0;
  const end = Date.parse(term.end_date + "T00:00:00Z");
  for (let t = Date.parse(term.start_date + "T00:00:00Z"); t <= end; t += DAY_MS) {
    n += perWeekday[new Date(t).getUTCDay()];
  }
  return n;
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
