import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { keys } from "@/lib/queries/core";
import { bangkokParts } from "@/lib/input";
import { shortDate } from "@/lib/format";

export type ClassroomAccount = { last_sync_at: string | null; last_error: "expired" | "failed" | null };
export type ClassroomCourse = { course_id: string; name: string; section: string | null; subject_id: string | null; enabled: boolean };

const accountKey = ["classroom-account"] as const;
const coursesKey = ["classroom-courses"] as const;

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("classroom", { body });
  if (error) throw error;
  return data as { url?: string };
}

export const syncLabel = (iso: string, today: string) => {
  const p = bangkokParts(iso);
  return p.date === today ? p.time : `${shortDate(p.date)} ${p.time}`;
};

export function useClassroomAccount() {
  return useQuery({
    queryKey: accountKey,
    queryFn: async () => {
      const r = await supabase.from("classroom_accounts").select("last_sync_at,last_error").maybeSingle();
      if (r.error) throw r.error;
      return r.data as ClassroomAccount | null;
    },
  });
}

export function useClassroomCourses() {
  return useQuery({
    queryKey: coursesKey,
    queryFn: async () => {
      const r = await supabase.from("classroom_courses").select("course_id,name,section,subject_id,enabled").order("name");
      if (r.error) throw r.error;
      return r.data as ClassroomCourse[];
    },
  });
}

/** ไปหน้าอนุญาตของ Google แล้วกลับมาที่ /classroom */
export async function connectClassroom() {
  const { url } = await invoke({ action: "start", origin: window.location.origin });
  if (url) window.location.assign(url);
}

export function useRefreshCourses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invoke({ action: "courses" }),
    onSettled: () => qc.invalidateQueries({ queryKey: coursesKey }),
  });
}

export function useSyncClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invoke({ action: "sync" }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: accountKey });
      qc.invalidateQueries({ queryKey: keys.assignments });
    },
  });
}

/** บันทึกห้องที่เลือกแล้วดึงงานทันที */
export function useSaveCourses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Pick<ClassroomCourse, "course_id" | "subject_id" | "enabled">[]) => {
      for (const { course_id, ...patch } of rows) {
        const r = await supabase.from("classroom_courses").update(patch).eq("course_id", course_id);
        if (r.error) throw r.error;
      }
      await invoke({ action: "sync" });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: coursesKey });
      qc.invalidateQueries({ queryKey: accountKey });
      qc.invalidateQueries({ queryKey: keys.assignments });
    },
  });
}

export function useDisconnectClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invoke({ action: "disconnect" }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: accountKey });
      qc.invalidateQueries({ queryKey: coursesKey });
    },
  });
}
