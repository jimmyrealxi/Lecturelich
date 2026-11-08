// แปลงงานจาก Classroom API เป็นแถว assignments · ไม่มีของ Deno จึงเทสต์ด้วย node ได้ (lib/classroom.test.ts)

export type Work = {
  id: string;
  courseId: string;
  title?: string;
  description?: string;
  alternateLink?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
  updateTime?: string;
};

export const workKey = (w: Work) => `${w.courseId}/${w.id}`;

/** Classroom เก็บเวลาเป็น UTC และตัดค่าที่เป็น 0 ทิ้ง (dueTime อาจเป็น {} หรือไม่มี) */
export function dueIso(w: Work): string | null {
  if (!w.dueDate) return null;
  const { year, month, day } = w.dueDate;
  return new Date(Date.UTC(year, month - 1, day, w.dueTime?.hours ?? 0, w.dueTime?.minutes ?? 0)).toISOString();
}

export function workFields(w: Work) {
  return {
    title: (w.title?.trim() || "งานจาก Classroom").slice(0, 120),
    due_at: dueIso(w),
    description: w.description?.slice(0, 4000) ?? null,
    link: w.alternateLink ?? null,
  };
}

/** งานใหม่ที่เลยกำหนดไปก่อนวันนี้ไม่ดึง · งานไม่มีวันส่งดึงเสมอ */
export const isCurrent = (dueAt: string | null, startOfTodayMs: number) => dueAt === null || Date.parse(dueAt) >= startOfTodayMs;

/** ข้อความแจ้งงานใหม่ · งานที่โพสต์นานกว่า 1 วันไม่แจ้ง กันเด้งรัวตอนเพิ่งเลือกห้อง */
export function newWorkNotice(w: Work, courseName: string, nowMs: number) {
  if (!w.updateTime || nowMs - Date.parse(w.updateTime) > 86_400_000) return null;
  const { title, due_at } = workFields(w);
  const due = due_at ? new Date(Date.parse(due_at) + 7 * 3_600_000).toISOString() : null;
  const when = due ? `ส่ง ${due.slice(8, 10)}/${due.slice(5, 7)} ${due.slice(11, 16)} น.` : "ไม่มีกำหนดส่ง";
  return { title: `งานใหม่: ${title}`, body: `${courseName} · ${when}`, url: "/tasks", ref: `classroom:${workKey(w)}` };
}

export type Submission = {
  courseWorkId: string;
  state?: string;
  submissionHistory?: { stateHistory?: { state?: string; stateTimestamp?: string } }[];
};

/** RETURNED = อาจารย์คืนงานแล้ว ถือว่าจบเหมือนส่ง · RECLAIMED_BY_STUDENT = ดึงกลับ ยังไม่นับ */
export const isTurnedIn = (s: Submission) => s.state === "TURNED_IN" || s.state === "RETURNED";

/** เวลากดส่งครั้งล่าสุด · null = อาจารย์คืนงานโดยนักเรียนไม่เคยกดส่ง */
export function turnedInAt(s: Submission): string | null {
  const times = (s.submissionHistory ?? [])
    .filter((h) => h.stateHistory?.state === "TURNED_IN" && h.stateHistory.stateTimestamp)
    .map((h) => Date.parse(h.stateHistory!.stateTimestamp!));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

/** งานที่ส่งไปก่อนเชื่อม Classroom ไม่ได้ XP ย้อนหลัง */
export const earnsXp = (at: string | null, connectedAt: string) => at !== null && Date.parse(at) >= Date.parse(connectedAt);

type Fields = ReturnType<typeof workFields>;

/** เทียบเวลาเป็นตัวเลข เพราะ DB คืน +00:00 แต่ฝั่งนี้เป็น Z */
export function isChanged(row: Fields, next: Fields) {
  const time = (v: string | null) => (v ? Date.parse(v) : null);
  return row.title !== next.title || row.description !== next.description || row.link !== next.link || time(row.due_at) !== time(next.due_at);
}
