import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AddBtn, Btn, head, pick, Section, Skeleton, T, Tape, confirmAction } from "@/components/ui";
import { AddTaskForm } from "@/components/AddTaskForm";
import { PhotoViewer } from "@/components/PhotoViewer";
import { useCurrentTerm, useSlots, useSubjects, type Subject } from "@/lib/queries/core";
import { useNote, useSaveNote, type Exam, type Note, type TopicRow } from "@/lib/queries/notes";
import { pickPhoto, signedUrls, thumbPath } from "@/lib/photos";
import { bangkokNow, type Slot } from "@/lib/schedule";
import { hhmm, thaiDate } from "@/lib/format";
import { isDate } from "@/lib/input";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const MAX_PHOTOS = 6;
const EXAMS: { value: Exclude<Exam, null>; label: string }[] = [
  { value: "midterm", label: "กลางภาค" },
  { value: "final", label: "ปลายภาค" },
];

/** จดหลังคาบ: /note/<slotId>?date=YYYY-MM-DD (ไม่ใส่ date = วันนี้) */
export default function NoteScreen() {
  const { slotId, date: dateParam } = useLocalSearchParams<{ slotId: string; date?: string }>();
  const date = dateParam && isDate(dateParam) ? dateParam : bangkokNow().date;
  const term = useCurrentTerm();
  const slots = useSlots(term.data?.id);
  const subjects = useSubjects(term.data?.id);
  const note = useNote(slotId, date);

  const slot = slots.data?.find((s) => s.id === slotId);
  const subject = subjects.data?.find((s) => s.id === slot?.subject_id);

  if (note.isPending || slots.isPending || subjects.isPending || term.isPending) {
    return <View style={s.screen}><View style={s.page}><Skeleton height={300} /></View></View>;
  }
  if (!slot || !subject) {
    return (
      <View style={[s.screen, s.page]}>
        <Text style={T.body}>ไม่พบคาบนี้ (อาจถูกลบไปแล้ว)</Text>
        <View style={{ flexDirection: "row", marginTop: space.md }}><Btn label="กลับหน้าวันนี้" onPress={() => router.replace("/today")} /></View>
      </View>
    );
  }
  // key = โน้ตเดิม/ใหม่ → ฟอร์มรับค่าเริ่มต้นครั้งเดียว
  return <NoteForm key={note.data?.id ?? "new"} slot={slot} subject={subject} date={date} existing={note.data ?? null} subjects={subjects.data ?? []} />;
}

function NoteForm({ slot, subject, date, existing, subjects }: {
  slot: Slot; subject: Subject; date: string; existing: Note | null; subjects: Subject[];
}) {
  const save = useSaveNote();
  const [text, setText] = useState(existing?.text ?? "");
  const [kept, setKept] = useState<string[]>(existing?.photo_paths ?? []);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [newUris, setNewUris] = useState<string[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>(existing?.topics ?? []);
  const [removedTopicIds, setRemovedTopicIds] = useState<string[]>([]);
  const [topicDraft, setTopicDraft] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  const thumbs = useQuery({
    queryKey: ["thumbs", existing?.id, existing?.photo_paths],
    enabled: kept.length > 0,
    queryFn: () => signedUrls((existing?.photo_paths ?? []).map(thumbPath)),
    staleTime: 50 * 60_000, // ลิงก์อยู่ได้ 1 ชม.
  });

  const photoCount = kept.length + newUris.length;
  const addPhoto = async (camera: boolean) => {
    const uri = await pickPhoto(camera);
    if (uri) setNewUris((u) => [...u, uri]);
  };
  const removePhoto = (i: number) => confirmAction("ลบรูปนี้?", () => {
    setViewing(photoCount === 1 ? null : Math.min(i, photoCount - 2));
    if (i < kept.length) {
      setRemovedPhotos((r) => [...r, kept[i]]);
      setKept((k) => k.filter((_, j) => j !== i));
    } else {
      setNewUris((n) => n.filter((_, j) => j !== i - kept.length));
    }
  });
  const addTopic = () => {
    const title = topicDraft.trim();
    if (!title) return;
    setTopics((t) => [...t, { title, is_starred: false, exam: "midterm" }]);
    setTopicDraft("");
  };
  const patchTopic = (i: number, p: Partial<TopicRow>) => setTopics((t) => t.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const removeTopic = (i: number) => {
    const t = topics[i];
    const go = () => {
      if (t.id) setRemovedTopicIds((r) => [...r, t.id!]);
      setTopics((all) => all.filter((_, j) => j !== i));
    };
    // หัวข้อที่บันทึกแล้วมีสถานะทวน (ขั้น 5) → ถามก่อนลบ
    if (t.id) confirmAction(`ลบหัวข้อ "${t.title}"?`, go);
    else go();
  };

  const empty = !text.trim() && photoCount === 0 && topics.length === 0;
  const onSave = () => {
    if (empty || save.isPending) return;
    // รอบันทึกเสร็จก่อนออก (มีรูปต้องอัปโหลด และถ้าล้มเหลวข้อความที่พิมพ์ต้องไม่หาย) · การ์ด "ยังไม่ได้จด" หายทันที
    save.mutate(
      {
        subject_id: subject.id, slot_id: slot.id, date, text, keptPhotos: kept, removedPhotos, newPhotoUris: newUris,
        topics, removedTopicIds,
      },
      { onSuccess: () => (router.canGoBack() ? router.back() : router.replace("/today")) },
    );
  };

  return (
    <View style={s.screen}>
      <View style={head.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/today"))} style={s.back} accessibilityRole="button">
          <Text style={head.back}>‹ ปิด</Text>
        </Pressable>
        <Text style={head.title} accessibilityRole="header">{existing ? "แก้โน้ต" : "จดหลังคาบ"}</Text>
        <Text style={s.topSub}>{subject.name} · {thaiDate(date)} {hhmm(slot.start_time)}–{hhmm(slot.end_time)}</Text>
      </View>

      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>วันนี้เรียนอะไร (สั้น ๆ)</Text>
        <TextInput value={text} onChangeText={setText} multiline maxLength={2000} style={s.textarea}
          placeholder="เช่น Graph เบื้องต้น, degree อาจารย์บอกออกสอบ" placeholderTextColor={color.placeholder} accessibilityLabel="วันนี้เรียนอะไร" />

        <Text style={s.label}>รูปกระดาน (ย่อรูปให้อัตโนมัติ · สูงสุด {MAX_PHOTOS} รูป)</Text>
        <View style={s.photos}>
          {kept.map((p, i) => (
            <Pressable key={p} accessibilityRole="button" accessibilityLabel={`ดูรูปที่ ${i + 1}`} onPress={() => setViewing(i)}>
              {thumbs.data?.[thumbPath(p)]
                ? <Image source={{ uri: thumbs.data[thumbPath(p)] }} style={s.thumb} />
                : <View style={[s.thumb, s.thumbEmpty]} />}
            </Pressable>
          ))}
          {newUris.map((u, i) => (
            <Pressable key={u} accessibilityRole="button" accessibilityLabel={`ดูรูปที่ ${kept.length + i + 1}`} onPress={() => setViewing(kept.length + i)}>
              <Image source={{ uri: u }} style={s.thumb} />
              <View style={s.thumbTape} />
            </Pressable>
          ))}
          {photoCount < MAX_PHOTOS && (
            <>
              <Pressable style={s.addPhoto} onPress={() => addPhoto(true)} accessibilityRole="button"><Text style={T.muted}>+ ถ่ายรูป</Text></Pressable>
              <Pressable style={s.addPhoto} onPress={() => addPhoto(false)} accessibilityRole="button"><Text style={T.muted}>+ เลือกรูป</Text></Pressable>
            </>
          )}
        </View>
        {photoCount > 0 && <Text style={[T.muted, { fontSize: 12, marginTop: 4 }]}>แตะรูปเพื่อดูหรือลบ</Text>}

        <Section side="กด ★ = อาจารย์บอกออกสอบ">หัวข้อที่เรียน</Section>
        {topics.map((t, i) => (
          <View key={t.id ?? "n" + i} style={s.trow}>
            <Text style={[T.body, { flex: 1 }]}>{t.title}</Text>
            {EXAMS.map((e) => (
              <Pressable key={e.value} onPress={() => patchTopic(i, { exam: t.exam === e.value ? null : e.value })}
                style={[s.exam, t.exam === e.value && s.examOn]} accessibilityRole="radio" accessibilityState={{ selected: t.exam === e.value }}>
                <Text style={[s.examText, t.exam === e.value && pick.onText]}>{e.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => patchTopic(i, { is_starred: !t.is_starred })} style={[s.star, t.is_starred && s.starOn]}
              accessibilityRole="checkbox" accessibilityState={{ checked: t.is_starred }} accessibilityLabel={`ออกสอบ: ${t.title}`}>
              <Text style={[s.starText, t.is_starred && { color: color.red }]}>{t.is_starred ? "★" : "☆"}</Text>
            </Pressable>
            <Pressable onPress={() => removeTopic(i)} style={s.star} accessibilityLabel={`ลบหัวข้อ ${t.title}`}>
              <Text style={{ color: color.danger, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <View style={s.trow}>
          <TextInput value={topicDraft} onChangeText={setTopicDraft} onSubmitEditing={addTopic} placeholder="+ เพิ่มหัวข้อ"
            placeholderTextColor={color.placeholder} maxLength={120} style={[T.body, s.topicInput]} returnKeyType="done" accessibilityLabel="เพิ่มหัวข้อ" />
          {!!topicDraft.trim() && <Btn label="เพิ่ม" onPress={addTopic} style={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto" }} />}
        </View>

        <Section>มีงานสั่งไหม</Section>
        <AddBtn label="+ เพิ่มงานของวิชานี้" onPress={() => setAddingTask(true)} />
        {save.error && <Text style={s.error}>บันทึกไม่สำเร็จ: {save.error.message}</Text>}
      </ScrollView>

      <View style={s.foot}>
        <Btn kind="primary" label={save.isPending ? "กำลังบันทึก…" : "บันทึก"} onPress={onSave} />
        {empty && <Text style={[T.muted, { textAlign: "center", marginTop: 6, fontSize: 12 }]}>พิมพ์ข้อความ ใส่รูป หรือเพิ่มหัวข้ออย่างน้อย 1 อย่าง</Text>}
      </View>

      {viewing !== null && (
        <PhotoViewer title={`${subject.name} · ${thaiDate(date)}`} index={viewing}
          photos={[
            ...kept.map((p) => ({ id: p, thumb: thumbs.data?.[thumbPath(p)] })),
            ...newUris.map((u) => ({ id: u, thumb: u, local: true })),
          ]}
          onIndex={setViewing} onClose={() => setViewing(null)} onDelete={removePhoto} />
      )}

      <Modal visible={addingTask} transparent animationType="slide" onRequestClose={() => setAddingTask(false)}>
        <Pressable style={s.dim} onPress={() => setAddingTask(false)} accessibilityLabel="ปิด" />
        <View style={s.sheet}>
          <Tape />
          <AddTaskForm subjects={subjects} today={bangkokNow().date} defaultSubjectId={subject.id} defaultSource="class"
            onDone={() => setAddingTask(false)} />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  back: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  topSub: { fontFamily: font.body, fontSize: 13, color: color.muted },
  page: { padding: space.lg, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  label: { fontFamily: font.body, fontSize: 13, color: color.muted, marginTop: space.md, marginBottom: 6 },
  textarea: {
    minHeight: 96, borderWidth: 1.5, borderColor: color.rule2, borderRadius: radius.md, padding: space.md, backgroundColor: color.field,
    fontFamily: font.body, fontSize: 16, color: color.paper, textAlignVertical: "top",
  },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  thumb: { width: 72, height: 56, borderRadius: radius.sm, backgroundColor: "rgba(42,33,24,0.12)", borderWidth: 1, borderColor: color.rule2 },
  thumbTape: { position: "absolute", top: -8, left: 18, width: 36, height: 14, backgroundColor: "rgba(232,221,186,0.85)", transform: [{ rotate: "-6deg" }] },
  thumbEmpty: { opacity: 0.6 },
  addPhoto: {
    width: 88, height: 56, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.rule2,
    alignItems: "center", justifyContent: "center",
  },
  trow: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: color.deck, borderWidth: 1, borderColor: color.rule2,
    borderRadius: radius.md, paddingLeft: space.md, paddingRight: 4, minHeight: 52, marginBottom: 6,
  },
  topicInput: { flex: 1, minHeight: minTouch, fontSize: 16 }, // iPhone ซูมจอเองถ้าช่องกรอกเล็กกว่า 16,
  exam: { minHeight: minTouch, paddingHorizontal: 8, borderRadius: radius.sm, borderWidth: 1.5, borderColor: color.paper, justifyContent: "center" },
  examOn: pick.on as object,
  examText: { fontFamily: font.bodyBold, fontSize: 12, color: color.paper },
  star: { width: minTouch, height: minTouch, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  // ★ ที่เลือก = วงปากกาแดง
  starOn: { borderWidth: 2, borderColor: color.red, borderRadius: 22 },
  starText: { fontSize: 20, color: color.muted },
  error: { fontFamily: font.body, fontSize: 13, color: color.danger, marginTop: space.sm },
  foot: { padding: space.md, borderTopWidth: 1, borderTopColor: color.rule2, backgroundColor: color.deck },
  dim: { flex: 1, backgroundColor: "rgba(42,33,24,0.45)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: color.deck,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: color.rule2,
    padding: space.lg, width: "100%", maxWidth: 560, alignSelf: "center",
  },
});
