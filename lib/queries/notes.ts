import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { deleteNotePhotos, uploadNotePhoto } from "@/lib/photos";

// จดหลังคาบ (ขั้น 2): โน้ต 1 อันต่อคาบ + หัวข้อ (⭐ = อาจารย์บอกออกสอบ)

export type Exam = "midterm" | "final" | null;
export type TopicRow = { id?: string; title: string; is_starred: boolean; exam: Exam };
export type Note = {
  id: string;
  subject_id: string;
  slot_id: string | null;
  date: string;
  text: string | null;
  photo_paths: string[];
  topics: Required<TopicRow>[];
};

const NOTE_COLS = "id,subject_id,slot_id,date,text,photo_paths,topics(id,title,is_starred,exam)";
const must = <T,>(r: { data: T | null; error: unknown }): T => {
  if (r.error) throw r.error;
  return r.data as T;
};

export const noteKeys = {
  day: (date: string) => ["notes-day", date] as const,
  subject: (subjectId: string) => ["notes-subject", subjectId] as const,
  one: (slotId: string, date: string) => ["note", slotId, date] as const,
};

/** slot ที่จดแล้วของวันหนึ่ง (ใช้กับการ์ด "ยังไม่ได้จด") */
export function useNotedSlots(date: string) {
  return useQuery({
    queryKey: noteKeys.day(date),
    queryFn: async () =>
      (must(await supabase.from("class_notes").select("slot_id").eq("date", date)) as { slot_id: string | null }[])
        .map((r) => r.slot_id)
        .filter((x): x is string => !!x),
  });
}

export function useSubjectNotes(subjectId: string) {
  return useQuery({
    queryKey: noteKeys.subject(subjectId),
    queryFn: async () =>
      must(await supabase.from("class_notes").select(NOTE_COLS).eq("subject_id", subjectId).order("date", { ascending: false }).limit(60)) as Note[],
  });
}

export function useNote(slotId: string, date: string) {
  return useQuery({
    queryKey: noteKeys.one(slotId, date),
    queryFn: async () =>
      must(await supabase.from("class_notes").select(NOTE_COLS).eq("slot_id", slotId).eq("date", date).maybeSingle()) as Note | null,
  });
}

export type SaveNoteInput = {
  subject_id: string;
  slot_id: string;
  date: string;
  text: string;
  keptPhotos: string[]; // path เดิมที่ยังเก็บไว้
  removedPhotos: string[];
  newPhotoUris: string[];
  topics: TopicRow[];
  removedTopicIds: string[];
};

/**
 * บันทึกโน้ต: อัปโหลดรูปใหม่ → upsert โน้ต → หัวข้อ (แก้ตาม id / เพิ่มใหม่ / ลบเฉพาะที่เอาออก เพื่อเก็บสถานะทวนของขั้น 5)
 * optimistic: การ์ด "ยังไม่ได้จด" หายทันที ล้มเหลวค่อยกลับมา
 */
export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (n: SaveNoteInput) => {
      const uploaded = await Promise.all(n.newPhotoUris.map((u) => uploadNotePhoto(u, n.date)));
      const note = must(
        await supabase
          .from("class_notes")
          .upsert(
            {
              subject_id: n.subject_id, slot_id: n.slot_id, date: n.date, text: n.text.trim() || null,
              photo_paths: [...n.keptPhotos, ...uploaded], updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,slot_id,date" },
          )
          .select("id")
          .single(),
      ) as { id: string };

      if (n.removedTopicIds.length) {
        must(await supabase.from("topics").delete().in("id", n.removedTopicIds).select("id"));
      }
      for (const { id, ...t } of n.topics) {
        const row = { ...t, title: t.title.trim() };
        must(
          await (id
            ? supabase.from("topics").update(row).eq("id", id)
            : supabase.from("topics").insert({ ...row, subject_id: n.subject_id, note_id: note.id })
          ).select("id"),
        );
      }
      await deleteNotePhotos(n.removedPhotos).catch(() => {}); // ลบรูปไม่ได้ไม่ทำให้โน้ตหาย
      return note;
    },
    onMutate: async (n) => {
      const key = noteKeys.day(n.date);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<string[]>(key);
      qc.setQueryData<string[]>(key, (old = []) => [...old, n.slot_id]);
      return { prev };
    },
    onError: (_e, n, ctx) => qc.setQueryData(noteKeys.day(n.date), ctx?.prev),
    onSettled: (_d, _e, n) => {
      qc.invalidateQueries({ queryKey: noteKeys.day(n.date) });
      qc.invalidateQueries({ queryKey: noteKeys.subject(n.subject_id) });
      qc.invalidateQueries({ queryKey: noteKeys.one(n.slot_id, n.date) });
      qc.invalidateQueries({ queryKey: ["topics"] }); // หัวข้อใช้กับบอส/ทวน (ขั้น 5)
    },
  });
}
