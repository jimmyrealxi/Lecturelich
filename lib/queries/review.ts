import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { afterReview, type ExamKind, type ExamRow, type Topic } from "@/lib/review";

// ทวนและบอส (ขั้น 5) · กด "ทวนแล้ว" = optimistic ด้วย afterReview แล้ว RPC review_topic ทำจริง (เลื่อนรอบ + XP)

export type TopicFull = Topic & {
  subject_id: string;
  title: string;
  exam: ExamKind | null;
  note_date: string | null;
  last_reviewed_at: string | null;
};

const must = <T,>(r: { data: T | null; error: unknown }): T => {
  if (r.error) throw r.error;
  return r.data as T;
};

export const reviewKeys = {
  topics: (termId: string) => ["topics", termId] as const,
  exams: (termId: string) => ["exams", termId] as const,
};

/** หัวข้อทุกวิชาในเทอม พร้อมวันที่จด (ใช้แบ่งบอสกลาง/ปลายภาค) */
export function useTopics(termId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.topics(termId ?? ""),
    enabled: !!termId,
    queryFn: async () => {
      // class_notes เป็น many-to-one → ได้ object (ไม่มี type ที่ generate จาก DB จึงแปลงผ่าน unknown)
      const rows = must<unknown>(
        await supabase
          .from("topics")
          .select("id,subject_id,title,is_starred,exam,review_stage,last_reviewed_at,next_review_at,created_at,class_notes(date),subjects!inner(term_id)")
          .eq("subjects.term_id", termId!)
          .order("created_at"),
      ) as (Omit<TopicFull, "note_date"> & { class_notes: { date: string } | null; subjects: unknown })[];
      return rows.map(({ class_notes, subjects: _s, ...t }) => ({ ...t, note_date: class_notes?.date ?? null })) as TopicFull[];
    },
  });
}

export function useExams(termId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.exams(termId ?? ""),
    enabled: !!termId,
    queryFn: async () =>
      must(
        await supabase.from("exams").select("subject_id,kind,date,subjects!inner(term_id)").eq("subjects.term_id", termId!),
      ).map(({ subjects: _s, ...e }: ExamRow & { subjects: unknown }) => e) as ExamRow[],
  });
}

export function useReviewTopic(termId: string) {
  const qc = useQueryClient();
  const key = reviewKeys.topics(termId);
  return useMutation({
    mutationFn: async (id: string) => must(await supabase.rpc("review_topic", { p_topic: id })),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TopicFull[]>(key);
      qc.setQueryData<TopicFull[]>(key, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, ...afterReview(t.review_stage, new Date()) } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** ย้อน "ทวนแล้ว" · t = ค่าก่อนกด (stage/วันที่เดิม) */
export function useUnreviewTopic(termId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: TopicFull) =>
      must(await supabase.rpc("unreview_topic", { p_topic: t.id, p_last: t.last_reviewed_at, p_next: t.next_review_at })),
    onMutate: (t) => qc.setQueryData<TopicFull[]>(reviewKeys.topics(termId), (old = []) => old.map((x) => (x.id === t.id ? t : x))),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.topics(termId) });
      qc.invalidateQueries({ queryKey: ["xp"] });
    },
  });
}

/** ตั้ง/ลบวันสอบของวิชา (date = null → ลบ) */
export function useSaveExams(termId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ subjectId, dates }: { subjectId: string; dates: Record<ExamKind, string | null> }) => {
      for (const kind of ["midterm", "final"] as const) {
        const date = dates[kind];
        must(
          await (date
            ? supabase.from("exams").upsert({ subject_id: subjectId, kind, date }, { onConflict: "user_id,subject_id,kind" })
            : supabase.from("exams").delete().eq("subject_id", subjectId).eq("kind", kind)
          ).select("subject_id"),
        );
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: reviewKeys.exams(termId) }),
  });
}
