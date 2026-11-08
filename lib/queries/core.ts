import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AttendanceStatus, Slot, Term } from "@/lib/schedule";
import type { Cutoffs } from "@/lib/grades";
import { mySubjectId } from "@/lib/rooms";

// ข้อมูลหลักของขั้น 1 · select เฉพาะคอลัมน์ที่ใช้ · การกดที่ใช้บ่อย = optimistic (เปลี่ยนจอก่อน ล้มเหลวค่อยย้อน)

export type CurrentTerm = Term & { id: string; name: string };
export type Subject = {
  id: string;
  code: string | null;
  name: string;
  color: string;
  classroom_url: string | null;
  line_url: string | null;
  notebooklm_url: string | null;
  grade_cutoffs: Cutoffs;
  target_grade: string;
};
export type AttendanceRow = { slot_id: string; subject_id: string; date: string; status: AttendanceStatus };
export type Assignment = {
  id: string;
  subject_id: string | null;
  title: string;
  due_at: string | null;
  source: "classroom" | "class" | "line";
  link: string | null;
  room_id: string | null; // null = งานส่วนตัว
  created_by: string;
  classroom_work_id?: string | null; // งานที่ดึงจาก Classroom
  done: boolean;
};

const must = <T,>(r: { data: T | null; error: unknown }): T => {
  if (r.error) throw r.error;
  return r.data as T;
};

export const keys = {
  term: ["term"] as const,
  subjects: (termId: string) => ["subjects", termId] as const,
  slots: (termId: string) => ["slots", termId] as const,
  attendance: (termId: string) => ["attendance", termId] as const,
  assignments: ["assignments"] as const,
};

export function useCurrentTerm() {
  return useQuery({
    queryKey: keys.term,
    queryFn: async () =>
      must(
        await supabase.from("terms").select("id,name,start_date,end_date").eq("is_current", true).maybeSingle(),
      ) as CurrentTerm | null,
  });
}

export function useSubjects(termId: string | undefined) {
  return useQuery({
    queryKey: keys.subjects(termId ?? ""),
    enabled: !!termId,
    queryFn: async () =>
      must(
        await supabase
          .from("subjects")
          .select("id,code,name,color,classroom_url,line_url,notebooklm_url,grade_cutoffs,target_grade")
          .eq("term_id", termId!)
          .order("name"),
      ) as Subject[],
  });
}

export function useSlots(termId: string | undefined) {
  return useQuery({
    queryKey: keys.slots(termId ?? ""),
    enabled: !!termId,
    queryFn: async () =>
      must(
        await supabase
          .from("class_slots")
          .select("id,subject_id,weekday,start_time,end_time,room,makeup_date,subjects!inner(term_id)")
          .eq("subjects.term_id", termId!),
      ).map(({ subjects: _s, ...slot }: Slot & { subjects: unknown }) => slot) as Slot[],
  });
}

/** เช็กชื่อทั้งเทอม (แถวเฉพาะคาบที่เช็กแล้ว — ใช้ทั้งหน้าวันนี้และ % เข้าเรียน) */
export function useAttendance(term: CurrentTerm | null | undefined) {
  return useQuery({
    queryKey: keys.attendance(term?.id ?? ""),
    enabled: !!term,
    queryFn: async () =>
      must(
        await supabase
          .from("attendance")
          .select("slot_id,subject_id,date,status")
          .gte("date", term!.start_date)
          .lte("date", term!.end_date),
      ) as AttendanceRow[],
  });
}

export function useSetAttendance(termId: string) {
  const qc = useQueryClient();
  const key = keys.attendance(termId);
  return useMutation({
    mutationFn: async (row: AttendanceRow) =>
      must(
        await supabase
          .from("attendance")
          .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id,slot_id,date" })
          .select("slot_id"),
      ),
    onMutate: async (row) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AttendanceRow[]>(key);
      qc.setQueryData<AttendanceRow[]>(key, (old = []) => [
        ...old.filter((r) => !(r.slot_id === row.slot_id && r.date === row.date)),
        row,
      ]);
      return { prev };
    },
    onError: (_e, _row, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** งดสอนทั้งวัน: off = บันทึก no_class ทุกคาบที่ส่งมา · ไม่ off = ล้างกลับเป็นยังไม่เช็ก */
export function useSetDayOff(termId: string) {
  const qc = useQueryClient();
  const key = keys.attendance(termId);
  return useMutation({
    mutationFn: async ({ slots, date, off }: { slots: Slot[]; date: string; off: boolean }) =>
      must(
        await (off
          ? supabase.from("attendance").upsert(
              slots.map((s) => ({ slot_id: s.id, subject_id: s.subject_id, date, status: "no_class", updated_at: new Date().toISOString() })),
              { onConflict: "user_id,slot_id,date" },
            )
          : supabase.from("attendance").delete().eq("date", date).in("slot_id", slots.map((s) => s.id))
        ).select("slot_id"),
      ),
    onMutate: async ({ slots, date, off }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AttendanceRow[]>(key);
      const ids = new Set(slots.map((s) => s.id));
      qc.setQueryData<AttendanceRow[]>(key, (old = []) => [
        ...old.filter((r) => !(r.date === date && ids.has(r.slot_id))),
        ...(off ? slots.map((s) => ({ slot_id: s.id, subject_id: s.subject_id, date, status: "no_class" as const })) : []),
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** งานส่วนตัว + งานในห้องที่เป็นสมาชิก เรียงตามกำหนดส่ง · subject_id ถูกแปลงเป็นวิชาของเราเอง (งานในห้องอาจผูกวิชาของเพื่อน) */
export function useAssignments() {
  return useQuery({
    queryKey: keys.assignments,
    queryFn: async () => {
      const [rows, mine] = await Promise.all([
        supabase
          .from("assignments")
          .select("id,subject_id,course_code,title,due_at,source,link,room_id,created_by,classroom_work_id,assignment_status(done)")
          .order("due_at", { ascending: true, nullsFirst: false })
          .then(must),
        supabase.from("subjects").select("id,code").then(must),
      ]);
      // assignment_status RLS = ของเราเท่านั้น → มีได้แถวเดียว
      return (rows as (Omit<Assignment, "done"> & { course_code: string | null; assignment_status: { done: boolean }[] })[]).map(
        ({ assignment_status, course_code, ...a }) => ({
          ...a,
          subject_id: mySubjectId({ subject_id: a.subject_id, course_code }, mine as { id: string; code: string | null }[]),
          done: assignment_status[0]?.done ?? false,
        }),
      );
    },
  });
}

export function useToggleDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) =>
      must(
        await supabase
          .from("assignment_status")
          .upsert(
            { assignment_id: id, done, submitted_at: done ? new Date().toISOString() : null },
            { onConflict: "user_id,assignment_id" },
          )
          .select("assignment_id"),
      ),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: keys.assignments });
      const prev = qc.getQueryData<Assignment[]>(keys.assignments);
      qc.setQueryData<Assignment[]>(keys.assignments, (old = []) => old.map((a) => (a.id === id ? { ...a, done } : a)));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(keys.assignments, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.assignments }),
  });
}

export type NewAssignment = Pick<Assignment, "subject_id" | "title" | "due_at" | "source" | "link" | "room_id">;

export function useAddAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: NewAssignment) =>
      must(await supabase.from("assignments").insert(a).select("id").single()),
    onMutate: async (a) => {
      await qc.cancelQueries({ queryKey: keys.assignments });
      const prev = qc.getQueryData<Assignment[]>(keys.assignments);
      qc.setQueryData<Assignment[]>(keys.assignments, (old = []) => [...old, { ...a, id: "temp-" + Date.now(), created_by: "", done: false }]);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(keys.assignments, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.assignments }),
  });
}

/** เปลี่ยนวิชา → ส่ง course_code: null ด้วย ให้ trigger เติมรหัสวิชาใหม่ (ไม่งั้นเพื่อนในห้องจับคู่วิชาเก่า) */
export type AssignmentPatch = Partial<Pick<Assignment, "subject_id" | "title" | "due_at" | "source" | "link">>;

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AssignmentPatch }) =>
      must(
        await supabase
          .from("assignments")
          .update("subject_id" in patch ? { ...patch, course_code: null } : patch)
          .eq("id", id)
          .select("id")
          .single(), // RLS ไม่ให้แก้ = 0 แถว → error → ย้อนค่าเดิม
      ),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.assignments });
      const prev = qc.getQueryData<Assignment[]>(keys.assignments);
      qc.setQueryData<Assignment[]>(keys.assignments, (old = []) => old.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(keys.assignments, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.assignments }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.from("assignments").delete().eq("id", id).select("id").single()),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.assignments });
      const prev = qc.getQueryData<Assignment[]>(keys.assignments);
      qc.setQueryData<Assignment[]>(keys.assignments, (old = []) => old.filter((a) => a.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(keys.assignments, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.assignments }),
  });
}
