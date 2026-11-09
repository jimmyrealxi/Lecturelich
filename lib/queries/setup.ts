import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUserId, supabase } from "@/lib/supabase";
import { keys, type Subject } from "@/lib/queries/core";
import { weekdayOf, type Slot } from "@/lib/schedule";

// ตั้งค่า: เทอม · วิชา + ช่วงเวลาเรียน · โปรไฟล์ (ไม่ใช่การกดบ่อย → รอผลจากเซิร์ฟเวอร์ ไม่ทำ optimistic)

const check = <T,>(r: { data: T | null; error: unknown }): T => {
  if (r.error) throw r.error;
  return r.data as T;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const id = await currentUserId();
      return check(
        await supabase.from("profiles").select("min_attendance_pct,remind_after_class_min").eq("id", id).maybeSingle(),
      ) as Profile | null;
    },
  });
}

export type Profile = { min_attendance_pct: number; remind_after_class_min: number };

/** แก้ค่าตั้งในโปรไฟล์ (optimistic — ตัวเลขเปลี่ยนทันทีตอนกด +/−) */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const id = await currentUserId();
      check(await supabase.from("profiles").update(patch).eq("id", id).select("id"));
    },
    onMutate: (patch) => {
      const prev = qc.getQueryData<Profile>(["profile"]);
      if (prev) qc.setQueryData(["profile"], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => qc.setQueryData(["profile"], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export type TermInput = { id?: string; name: string; start_date: string; end_date: string };

/** บันทึกเทอมและตั้งเป็นเทอมปัจจุบัน (มีได้คนละ 1 → ปลดเทอมเดิมก่อน) */
export function useSaveTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...t }: TermInput) => {
      let unset = supabase.from("terms").update({ is_current: false }).eq("is_current", true);
      if (id) unset = unset.neq("id", id); // เทียบ uuid กับ "" จะ error จึงใส่เฉพาะตอนแก้เทอมเดิม
      check(await unset.select("id"));
      const q = id
        ? supabase.from("terms").update({ ...t, is_current: true }).eq("id", id)
        : supabase.from("terms").insert({ ...t, is_current: true });
      return check(await q.select("id").single());
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export type SlotInput = Omit<Slot, "id" | "subject_id"> & { id?: string };
export type SubjectInput = Omit<Subject, "id" | "grade_cutoffs" | "target_grade"> & { id?: string; slots: SlotInput[] };

/**
 * บันทึกวิชา + ช่วงเวลา: แก้ช่วงเดิมตาม id / เพิ่มช่วงใหม่ / ลบเฉพาะช่วงที่เอาออก
 * (ไม่ลบทั้งหมดแล้วสร้างใหม่ เพราะการเช็กชื่อผูกกับช่วงเวลาและจะหายตาม)
 */
export function useSaveSubject(termId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, slots, ...subject }: SubjectInput) => {
      const saved = check(
        await (id
          ? supabase.from("subjects").update(subject).eq("id", id)
          : supabase.from("subjects").insert({ ...subject, term_id: termId })
        ).select("id").single(),
      ) as { id: string };

      const keep = slots.filter((s) => s.id).map((s) => s.id as string);
      if (id) {
        // คาบชดเชยไม่อยู่ในฟอร์มแก้วิชา ห้ามถูกลบตามไปด้วย
        let del = supabase.from("class_slots").delete().eq("subject_id", saved.id).is("makeup_date", null);
        if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
        check(await del.select("id"));
      }
      for (const { id: slotId, ...s } of slots) {
        check(
          await (slotId
            ? supabase.from("class_slots").update(s).eq("id", slotId)
            : supabase.from("class_slots").insert({ ...s, subject_id: saved.id })
          ).select("id"),
        );
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.subjects(termId) });
      qc.invalidateQueries({ queryKey: keys.slots(termId) });
    },
  });
}

export type MakeupInput = Pick<Slot, "subject_id" | "start_time" | "end_time" | "room"> & { makeup_date: string };

export function useAddMakeup(termId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: MakeupInput) =>
      check(await supabase.from("class_slots").insert({ ...m, weekday: weekdayOf(m.makeup_date) }).select("id")),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.slots(termId) }),
  });
}

/** ลบคาบชดเชย: การเช็กชื่อของคาบนั้นหายตาม (cascade) โน้ตยังอยู่ (set null) */
export function useDeleteMakeup(termId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("class_slots").delete().eq("id", id).select("id")),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.slots(termId) });
      qc.invalidateQueries({ queryKey: keys.attendance(termId) });
    },
  });
}

export function useDeleteSubject(termId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => check(await supabase.from("subjects").delete().eq("id", id).select("id")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects", termId] }).then(() =>
      qc.invalidateQueries({ queryKey: keys.slots(termId) })),
  });
}
