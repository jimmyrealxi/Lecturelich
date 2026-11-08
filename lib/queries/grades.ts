import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { keys, type Subject } from "@/lib/queries/core";
import type { ComponentRow, Cutoffs } from "@/lib/grades";

// คะแนนและเกรด (ขั้น 3) · เพิ่ม/ลบคะแนน + เลือกเกรดเป้าหมาย = optimistic · แก้ส่วนคะแนน/เกณฑ์ = รอผลเซิร์ฟเวอร์

export type ScoreRow = { id: string; title: string | null; score: number; max_score: number };
export type GradeComponent = Omit<ComponentRow, "scores"> & { id: string; sort: number; scores: ScoreRow[] };
export type ComponentInput = { id?: string; name: string; weight: number; max_score: number; is_final: boolean; sort: number };

const must = <T,>(r: { data: T | null; error: unknown }): T => {
  if (r.error) throw r.error;
  return r.data as T;
};

export const gradeKey = (subjectId: string) => ["grades", subjectId] as const;

export function useGradeComponents(subjectId: string) {
  return useQuery({
    queryKey: gradeKey(subjectId),
    queryFn: async () =>
      must(
        await supabase
          .from("grade_components")
          .select("id,name,weight,max_score,is_final,sort,scores(id,title,score,max_score)")
          .eq("subject_id", subjectId)
          .order("sort")
          .order("created_at"),
      ) as GradeComponent[],
  });
}

export function useAddScore(subjectId: string) {
  const qc = useQueryClient();
  const key = gradeKey(subjectId);
  return useMutation({
    mutationFn: async (v: { component_id: string; title: string | null; score: number; max_score: number }) =>
      must(await supabase.from("scores").insert(v).select("id").single()),
    onMutate: async ({ component_id, ...row }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<GradeComponent[]>(key);
      qc.setQueryData<GradeComponent[]>(key, (old = []) =>
        old.map((c) => (c.id === component_id ? { ...c, scores: [...c.scores, { ...row, id: "temp-" + Date.now() }] } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteScore(subjectId: string) {
  const qc = useQueryClient();
  const key = gradeKey(subjectId);
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.from("scores").delete().eq("id", id).select("id")),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<GradeComponent[]>(key);
      qc.setQueryData<GradeComponent[]>(key, (old = []) => old.map((c) => ({ ...c, scores: c.scores.filter((x) => x.id !== id) })));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** เพิ่มหลายส่วน หรือแก้ 1 ส่วน · ตั้งเป็นปลายภาค → ปลดส่วนอื่นก่อน (มีได้ส่วนเดียวต่อวิชา) */
export function useSaveComponents(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: ComponentInput[]) => {
      const finalId = items.find((c) => c.is_final)?.id;
      if (items.some((c) => c.is_final)) {
        let unset = supabase.from("grade_components").update({ is_final: false }).eq("subject_id", subjectId).eq("is_final", true);
        if (finalId) unset = unset.neq("id", finalId);
        must(await unset.select("id"));
      }
      for (const { id, ...c } of items) {
        must(
          await (id
            ? supabase.from("grade_components").update(c).eq("id", id)
            : supabase.from("grade_components").insert({ ...c, subject_id: subjectId })
          ).select("id"),
        );
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: gradeKey(subjectId) }),
  });
}

export function useDeleteComponent(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.from("grade_components").delete().eq("id", id).select("id")),
    onSettled: () => qc.invalidateQueries({ queryKey: gradeKey(subjectId) }),
  });
}

/** เกรดเป้าหมาย / เกณฑ์ตัดเกรด ของวิชา (optimistic ในแคชรายการวิชา) */
export function useUpdateSubjectGrade(termId: string) {
  const qc = useQueryClient();
  const key = keys.subjects(termId);
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; target_grade?: string; grade_cutoffs?: Cutoffs }) =>
      must(await supabase.from("subjects").update(patch).eq("id", id).select("id")),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Subject[]>(key);
      qc.setQueryData<Subject[]>(key, (old = []) => old.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
