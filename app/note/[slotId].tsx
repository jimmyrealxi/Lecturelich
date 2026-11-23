import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Btn, head, Skeleton, T, Tape, confirmAction } from "@/components/ui";
import { AddTaskForm } from "@/components/AddTaskForm";
import { PhotoViewer } from "@/components/PhotoViewer";
import { useCurrentTerm, useSlots, useSubjects, type Subject } from "@/lib/queries/core";
import { useNote, useSaveNote, type Note, type TopicRow } from "@/lib/queries/notes";
import { pickPhoto, signedUrls, thumbPath } from "@/lib/photos";
import { bangkokNow, nextClassDate, type Slot } from "@/lib/schedule";
import { hhmm, thaiDate } from "@/lib/format";
import { isDate } from "@/lib/input";
import { looksLikeClassName } from "@/lib/review";
import { color, font, minTouch, radius, space } from "@/lib/theme";

const MAX_PHOTOS = 6;

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
  return <NoteForm key={note.data?.id ?? "new"} slot={slot} subject={subject} date={date} existing={note.data ?? null} subjects={subjects.data ?? []}
    nextDate={nextClassDate(date, subject.id, slots.data ?? [], term.data ?? null)} />;
}

function NoteForm({ slot, subject, date, existing, subjects, nextDate }: {
  slot: Slot; subject: Subject; date: string; existing: Note | null; subjects: Subject[]; nextDate: string | null;
}) {
  const save = useSaveNote();
  const [text, setText] = useState(existing?.text ?? "");
  const [nextText, setNextText] = useState(existing?.next_text ?? "");
  const [readMore, setReadMore] = useState(existing?.read_more ?? "");
  const [nameWarn, setNameWarn] = useState(false);
  const [kept, setKept] = useState<string[]>(existing?.photo_paths ?? []);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [newUris, setNewUris] = useState<string[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>(existing?.topics ?? []);
  const [removedTopicIds, setRemovedTopicIds] = useState<string[]>([]);
  const [topicDraft, setTopicDraft] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [showLong, setShowLong] = useState(!!existing?.text);
  const [showRead, setShowRead] = useState(!!existing?.read_more);

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
  /** force = กด "ใช้ชื่อนี้" หลังขึ้นเตือนชื่อเหมือนชื่อคาบ */
  const addTopic = (force = false) => {
    const title = topicDraft.trim();
    if (!title) return;
    if (!force && looksLikeClassName(title, subject.name)) return setNameWarn(true);
    setTopics((t) => [...t, { title, is_starred: false, exam: null }]); // ไม่ติดป้าย = ดูวันที่จดเทียบวันสอบกลางภาค
    setTopicDraft("");
    setNameWarn(false);
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

  const empty = !text.trim() && !nextText.trim() && !readMore.trim() && photoCount === 0 && topics.length === 0;
  const onSave = () => {
    if (empty || save.isPending) return;
    // รอบันทึกเสร็จก่อนออก (มีรูปต้องอัปโหลด และถ้าล้มเหลวข้อความที่พิมพ์ต้องไม่หาย) · การ์ด "ยังไม่ได้จด" หายทันที
    save.mutate(
      {
        subject_id: subject.id, slot_id: slot.id, date, text, next_text: nextText, read_more: readMore, keptPhotos: kept, removedPhotos, newPhotoUris: newUris,
        topics, removedTopicIds,
      },
      { onSuccess: () => (router.canGoBack() ? router.back() : router.replace("/today")) },
    );
  };

  return (
    <View style={s.screen}>
      <View style={head.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/today"))} style={head.backBtn} accessibilityRole="button">
          <Text style={head.back}>‹ ปิด</Text>
        </Pressable>
        <Text style={head.title} accessibilityRole="header">{existing ? "แก้โน้ต" : "จดหลังคาบ"}</Text>
        <Text style={s.topSub}>{subject.name} · {thaiDate(date)} {hhmm(slot.start_time)}–{hhmm(slot.end_time)}</Text>
      </View>

      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Q n={1} title="วันนี้เรียนเรื่องอะไร" sub="บรรทัดละเรื่อง · ★ = อาจารย์บอกออกสอบ" />
        {topics.map((t, i) => (
          <View key={t.id ?? "n" + i} style={[s.trow, i === 0 && s.trowFirst]}>
            <Text style={s.topic}>{t.title}</Text>
            <Pressable onPress={() => patchTopic(i, { is_starred: !t.is_starred })} style={[s.star, t.is_starred && s.starOn]}
              accessibilityRole="checkbox" accessibilityState={{ checked: t.is_starred }} accessibilityLabel={`ออกสอบ: ${t.title}`}>
              <Text style={[s.starText, t.is_starred && { color: color.red }]}>{t.is_starred ? "★" : "☆"}</Text>
            </Pressable>
            <Pressable onPress={() => removeTopic(i)} style={s.star} accessibilityLabel={`ลบหัวข้อ ${t.title}`}>
              <Text style={{ color: color.danger, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <View style={s.addRow}>
          <TextInput value={topicDraft} onChangeText={(v) => { setTopicDraft(v); setNameWarn(false); }} onSubmitEditing={() => addTopic()}
            blurOnSubmit={false} placeholder="เช่น CIA triad คืออะไร" placeholderTextColor={color.placeholder} maxLength={120}
            style={[s.input, { flex: 1 }]} returnKeyType="done" enterKeyHint="done" accessibilityLabel="เพิ่มเรื่องที่เรียน" />
          <Pressable onPress={() => addTopic()} style={({ pressed }) => [s.addBtn, !topicDraft.trim() && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}
            accessibilityRole="button" accessibilityState={{ disabled: !topicDraft.trim() }}>
            <Text style={s.addBtnText}>เพิ่ม</Text>
          </Pressable>
        </View>
        {nameWarn && (
          <View style={s.warn} accessibilityLiveRegion="polite" role="alert">
            <Text style={s.warnText}>
              <Text style={{ fontFamily: font.bodyBold, color: color.warn }}>ตั้งชื่อเหมือนชื่อคาบ </Text>
              พอถึงวันทวนจะไม่รู้ว่าต้องทวนอะไร ลองเขียนเป็นเรื่องที่เรียน เช่น “Proof of Work คืออะไร”
            </Text>
            <View style={{ flexDirection: "row", gap: space.lg }}>
              <Pressable onPress={() => addTopic(true)} style={s.warnBtn} accessibilityRole="button"><Text style={s.warnLink}>ใช้ชื่อนี้</Text></Pressable>
              <Pressable onPress={() => { setNameWarn(false); setTopicDraft(""); }} style={s.warnBtn} accessibilityRole="button"><Text style={s.warnLink}>แก้ชื่อ</Text></Pressable>
            </View>
          </View>
        )}
        {showLong ? (
          <>
          <Text style={s.fieldLabel}>จดเพิ่ม</Text>
          <TextInput value={text} onChangeText={setText} multiline maxLength={2000} style={[s.input, s.textarea]} autoFocus={!text}
            placeholder="จดยาว ๆ ตรงนี้ ถ้ามี" placeholderTextColor={color.placeholder} accessibilityLabel="จดเพิ่ม" />
          </>
        ) : (
          <Pressable onPress={() => setShowLong(true)} style={s.more} accessibilityRole="button">
            <Text style={s.moreText}>+ จดเพิ่ม (ไม่ใส่ก็ได้)</Text>
          </Pressable>
        )}

        <Q n={2} title="รูปกระดาน" sub="ไม่มีก็ข้ามได้" />
        {photoCount > 0 && (
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
          </View>
        )}
        {photoCount < MAX_PHOTOS ? (
          <View style={s.cam}>
            <Pressable style={({ pressed }) => [s.camBig, pressed && { opacity: 0.7 }]} onPress={() => addPhoto(true)} accessibilityRole="button">
              <Text style={s.camBigText}>{photoCount ? "ถ่ายอีกรูป" : "ถ่ายรูปกระดาน"}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [s.camSmall, pressed && { opacity: 0.7 }]} onPress={() => addPhoto(false)} accessibilityRole="button">
              <Text style={s.camSmallText}>เลือกจากเครื่อง</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={s.hint}>ครบ {MAX_PHOTOS} รูปแล้ว</Text>
        )}
        {photoCount > 0 && <Text style={s.hint}>แตะรูปเพื่อดูหรือลบ</Text>}

        <Q n={3} title="อาจารย์บอกอะไรไว้" sub="สอบ ประกาศ ของที่ต้องเอามา" />
        <TextInput value={nextText} onChangeText={setNextText} maxLength={300} style={s.input}
          placeholder="เช่น อาทิตย์หน้าสอบบท 1–3" placeholderTextColor={color.placeholder} accessibilityLabel="อาจารย์บอกอะไรไว้" />
        <Text style={s.hint}>ขึ้นเป็นใบประกาศในหน้าวันนี้ จนถึงคาบหน้า</Text>
        <View style={s.chips}>
          <Pressable onPress={() => setAddingTask(true)} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Text style={s.chipText}>+ ทำเป็นงาน</Text>
          </Pressable>
          {!showRead && (
            <Pressable onPress={() => setShowRead(true)} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Text style={s.chipText}>+ อ่านเพิ่ม</Text>
            </Pressable>
          )}
        </View>
        {showRead && (
          <>
          <Text style={s.fieldLabel}>อ่านเพิ่ม</Text>
          <TextInput value={readMore} onChangeText={setReadMore} maxLength={500} style={s.input} autoFocus={!readMore}
            placeholder="อ่านเพิ่ม: ชื่อหนังสือหรือวางลิงก์" placeholderTextColor={color.placeholder} accessibilityLabel="อ่านเพิ่ม" />
          </>
        )}
        {save.error && <Text style={s.error}>บันทึกไม่สำเร็จ: {save.error.message}</Text>}
      </ScrollView>

      <View style={s.foot}>
        <Btn kind="primary" label={save.isPending ? "กำลังบันทึก…" : "บันทึก"} onPress={onSave} />
        {empty && <Text style={[T.muted, { textAlign: "center", marginTop: 6 }]}>พิมพ์ข้อความ ใส่รูป หรือเพิ่มหัวข้ออย่างน้อย 1 อย่าง</Text>}
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
            defaultTitle={nextText.trim()} defaultDue={nextDate ? { date: nextDate, time: hhmm(slot.start_time) } : undefined}
            onDone={() => setAddingTask(false)} />
        </View>
      </Modal>
    </View>
  );
}

/** หัวคำถามมีเลขข้อ (docs/mockups/a-note-v2.html) */
function Q({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <View style={s.q}>
      <View style={s.qn}><Text style={s.qnText}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.qTitle} accessibilityRole="header">{title}</Text>
        <Text style={s.qSub}>{sub}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  topSub: { fontFamily: font.body, fontSize: 15, color: color.muted },
  page: { padding: space.lg, paddingTop: 0, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  q: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 26, marginBottom: 10 },
  qn: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.paper, alignItems: "center", justifyContent: "center", marginTop: 3 },
  qnText: { fontFamily: font.typeBold, fontSize: 15, color: color.deck },
  qTitle: { fontFamily: font.title, fontSize: 20, lineHeight: 30, color: color.paper },
  qSub: { fontFamily: font.body, fontSize: 14, color: color.muted },
  hint: { fontFamily: font.body, fontSize: 14, color: color.muted, marginTop: 4 },
  input: {
    minHeight: minTouch, borderWidth: 1.5, borderColor: color.rule2, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10,
    backgroundColor: color.field, fontFamily: font.body, fontSize: 16, color: color.paper, // iPhone ซูมจอเองถ้าช่องกรอกเล็กกว่า 16
  },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  fieldLabel: { fontFamily: font.bodyBold, fontSize: 14, color: color.muted, marginTop: space.md, marginBottom: 4 },
  // หัวข้อ = บรรทัดสมุด ตัวหนา
  trow: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 48, borderBottomWidth: 1, borderBottomColor: color.rule },
  trowFirst: { borderTopWidth: 1, borderTopColor: color.rule },
  topic: { flex: 1, fontFamily: font.bodyBold, fontSize: 16, color: color.paper, paddingVertical: 6 },
  addRow: { flexDirection: "row", gap: 6, marginTop: space.sm },
  addBtn: { minHeight: minTouch, paddingHorizontal: 16, borderWidth: 1.5, borderColor: color.paper, borderRadius: radius.md, justifyContent: "center" },
  addBtnText: { fontFamily: font.bodyBold, fontSize: 15, color: color.paper },
  more: { minHeight: minTouch, justifyContent: "center", alignSelf: "flex-start" },
  moreText: { fontFamily: font.bodyBold, fontSize: 15, color: color.pen },
  warn: { borderWidth: 1.5, borderColor: color.warn, borderRadius: radius.sm, padding: space.md, paddingBottom: 0, marginTop: space.sm, backgroundColor: "rgba(138,63,8,0.07)" },
  warnText: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.paper },
  warnBtn: { minHeight: minTouch, justifyContent: "center" },
  warnLink: { fontFamily: font.bodyBold, fontSize: 15, color: color.pen, textDecorationLine: "underline" },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm, paddingTop: 6 },
  thumb: { width: 72, height: 56, borderRadius: radius.sm, backgroundColor: "rgba(42,33,24,0.12)", borderWidth: 1, borderColor: color.rule2 },
  thumbTape: { position: "absolute", top: -8, left: 18, width: 36, height: 14, backgroundColor: "rgba(232,221,186,0.85)", transform: [{ rotate: "-6deg" }] },
  thumbEmpty: { opacity: 0.6 },
  cam: { flexDirection: "row", gap: space.sm },
  camBig: {
    flex: 1, minHeight: 56, borderWidth: 2, borderStyle: "dashed", borderColor: color.paper, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm,
  },
  camBigText: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper },
  camSmall: {
    minHeight: 56, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.rule2, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.md,
  },
  camSmallText: { fontFamily: font.bodyBold, fontSize: 14, color: color.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  chip: { minHeight: minTouch, paddingHorizontal: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.rule2, borderRadius: radius.md, justifyContent: "center" },
  chipText: { fontFamily: font.bodyBold, fontSize: 15, color: color.paper },
  star: { width: minTouch, height: minTouch, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  // ★ ที่เลือก = วงปากกาแดง
  starOn: { borderWidth: 2, borderColor: color.red, borderRadius: 22 },
  starText: { fontSize: 20, color: color.muted },
  error: { fontFamily: font.body, fontSize: 15, color: color.danger, marginTop: space.sm },
  foot: { padding: space.md, borderTopWidth: 1, borderTopColor: color.rule2, backgroundColor: color.deck },
  dim: { flex: 1, backgroundColor: "rgba(42,33,24,0.45)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", backgroundColor: color.deck,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: color.rule2,
    padding: space.lg, width: "100%", maxWidth: 560, alignSelf: "center",
  },
});
