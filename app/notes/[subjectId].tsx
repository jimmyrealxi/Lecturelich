import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Crt, CrtLabel, head, Section, T, Tick, UndoBar } from "@/components/ui";
import { NotesTimeline } from "@/components/NotesTimeline";
import { useAttendance, useCurrentTerm, useSlots, useSubjects } from "@/lib/queries/core";
import { useSubjectNotes } from "@/lib/queries/notes";
import { useReviewTopic, useTopics, useUnreviewTopic, type TopicFull } from "@/lib/queries/review";
import { bangkokNow, nextClassDate } from "@/lib/schedule";
import { hhmm, thaiDate } from "@/lib/format";
import { color, crtGlow, font, minTouch, radius, space } from "@/lib/theme";

const DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

/**
 * โน้ตของวิชา (docs/mockups/a-notes-review.html): มีแค่โน้ต คาบหน้า อ่านเพิ่ม
 * /notes/<subjectId>?topic=<topicId> = เปิดจาก "ทวนวันนี้" → เลื่อนไปคาบนั้น + ปุ่มทวนแล้วด้านล่าง
 */
export default function SubjectNotesScreen() {
  const { subjectId, topic: topicId } = useLocalSearchParams<{ subjectId: string; topic?: string }>();
  const term = useCurrentTerm();
  const subjects = useSubjects(term.data?.id);
  const slots = useSlots(term.data?.id);
  const attendance = useAttendance(term.data);
  const notes = useSubjectNotes(subjectId);
  const today = bangkokNow().date;

  const subject = subjects.data?.find((x) => x.id === subjectId);
  const mySlots = (slots.data ?? []).filter((x) => x.subject_id === subjectId && !x.makeup_date);
  const absentKeys = useMemo(
    () => new Set((attendance.data ?? []).filter((r) => r.status === "absent").map((r) => `${r.slot_id}:${r.date}`)),
    [attendance.data],
  );

  // คาบหน้า = ช่อง next_text ของโน้ตล่าสุดที่กรอก · ซ่อนเมื่อคาบนั้นผ่านไปแล้ว
  const next = useMemo(() => {
    const n = notes.data?.find((x) => x.next_text);
    if (!n || !term.data) return null;
    const on = nextClassDate(n.date, subjectId, slots.data ?? [], term.data);
    return on && on >= today ? { on, text: n.next_text!, from: n.date } : null;
  }, [notes.data, term.data, slots.data, subjectId, today]);
  const reads = (notes.data ?? []).filter((n) => n.read_more);

  // เลื่อนไปคาบที่จดหัวข้อนั้นครั้งเดียว (รอทั้งตำแหน่งไทม์ไลน์และตำแหน่งการ์ด)
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [tlY, setTlY] = useState<number | null>(null);
  const [focusY, setFocusY] = useState<number | null>(null);
  const scrolled = useRef(false);
  useEffect(() => {
    if (scrolled.current || tlY === null || focusY === null) return;
    scrolled.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, tlY + focusY - 24), animated: false });
  }, [tlY, focusY]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/today"));

  return (
    <View style={{ flex: 1 }}>
      <View style={head.top}>
        <Pressable onPress={back} style={head.backBtn} accessibilityRole="button" accessibilityLabel="ย้อนกลับ">
          <Text style={head.back}>‹ กลับ</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/subject/${subjectId}`)} style={s.right} accessibilityRole="link">
          <Text style={head.back}>หน้าวิชา</Text>
        </Pressable>
        <Text style={head.title} accessibilityRole="header">{subject?.name ?? "…"}</Text>
        <Text style={s.topSub}>
          {[subject?.code, ...mySlots.map((sl) => `${DAY[sl.weekday]} ${hhmm(sl.start_time)}–${hhmm(sl.end_time)}`)].filter(Boolean).join(" · ")}
        </Text>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={[s.page, topicId && { paddingBottom: 120 }]}>
        {next && (
          <Crt style={{ marginTop: space.sm }}>
            <CrtLabel>{`คาบหน้า ${thaiDate(next.on)}`}</CrtLabel>
            <Text style={s.crtMain}>{next.text}</Text>
            <Text style={s.crtSub}>จากโน้ต {thaiDate(next.from)}</Text>
          </Crt>
        )}

        {reads.length > 0 && (
          <>
            <Section>อ่านเพิ่ม</Section>
            {reads.map((n) => {
              const url = /^https?:\/\/\S+$/i.test(n.read_more!.trim()) ? n.read_more!.trim() : null;
              const body = (
                <>
                  <Text style={[T.body, url && s.url]} numberOfLines={url ? 1 : undefined}>{n.read_more}</Text>
                  <Text style={T.muted}>จากโน้ต {thaiDate(n.date)}</Text>
                </>
              );
              return url ? (
                <Pressable key={n.id} style={s.read} onPress={() => Linking.openURL(url)} accessibilityRole="link">{body}</Pressable>
              ) : (
                <View key={n.id} style={s.read}>{body}</View>
              );
            })}
          </>
        )}

        <Section>โน้ตแต่ละคาบ</Section>
        <View onLayout={(e) => setTlY(e.nativeEvent.layout.y)}>
          <NotesTimeline subjectId={subjectId} subjectName={subject?.name ?? ""} absentKeys={absentKeys}
            focusTopic={topicId} onFocusY={setFocusY} />
        </View>
      </ScrollView>

      {topicId && term.data && <ReviewBar termId={term.data.id} topicId={topicId} />}
    </View>
  );
}

/** แถบล่าง: อ่านจบกดทวนได้เลย · กดแล้วมีแถบยกเลิก 3 วิ (เหมือนหน้าวันนี้) */
function ReviewBar({ termId, topicId }: { termId: string; topicId: string }) {
  const topic = useTopics(termId).data?.find((t) => t.id === topicId);
  const review = useReviewTopic(termId);
  const unreview = useUnreviewTopic(termId);
  const [pressed, setPressed] = useState<TopicFull | null>(null);
  const [toast, setToast] = useState<{ undo: () => void } | null>(null);
  const [barH, setBarH] = useState(72);
  if (!topic) return null;

  const due = topic.review_stage === 0 || !topic.next_review_at || Date.parse(topic.next_review_at) <= Date.now();
  const done = !!pressed || !due;
  const press = () => {
    const before = topic;
    setPressed(before);
    const p = review.mutateAsync(before.id);
    p.catch(() => setPressed(null));
    setToast({
      undo: () => {
        setPressed(null);
        p.then(() => unreview.mutate(before), () => {});
      },
    });
  };

  return (
    <>
      <View style={s.bar} onLayout={(e) => setBarH(e.nativeEvent.layout.height)}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.barK}>{done && !pressed ? "ทวนรอบนี้แล้ว" : "กำลังทวน"}</Text>
          <Text style={s.barT} numberOfLines={1}>{topic.title}</Text>
        </View>
        {done ? (
          <View style={s.done}><Tick /><Text style={s.doneText}>ทวนแล้ว</Text></View>
        ) : (
          <Pressable style={s.primary} onPress={press} accessibilityRole="button" accessibilityLabel={`ทวน ${topic.title} แล้ว`}>
            <Text style={s.primaryText}>ทวนแล้ว</Text>
          </Pressable>
        )}
      </View>
      {toast && (
        <View style={[s.toastWrap, { bottom: barH }]} pointerEvents="box-none">
          <UndoBar text={`ทวน “${topic.title}” แล้ว`} onUndo={() => { toast.undo(); setToast(null); }} onClose={setToast} />
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  right: { position: "absolute", right: space.lg, top: space.md, minHeight: 52, minWidth: 72, alignItems: "flex-end", justifyContent: "center" },
  topSub: { fontFamily: font.body, fontSize: 15, color: color.muted, marginTop: 2 },
  page: { padding: space.lg, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  crtMain: { fontFamily: font.bodyBold, fontSize: 18, lineHeight: 25, color: color.crtOn, marginTop: 2, ...crtGlow.title },
  crtSub: { fontFamily: font.body, fontSize: 14, color: color.crtDim, marginTop: 2 },
  read: { minHeight: minTouch, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: color.rule, justifyContent: "center" },
  url: { color: color.pen, textDecorationLine: "underline" },
  bar: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: color.deck, borderTopWidth: 1.5, borderTopColor: color.rule2,
  },
  barK: { fontFamily: font.body, fontSize: 14, color: color.muted },
  barT: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper },
  primary: {
    minHeight: minTouch, paddingHorizontal: space.lg, justifyContent: "center", backgroundColor: color.paper, borderRadius: radius.sm,
    shadowColor: color.rule2, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
  },
  primaryText: { fontFamily: font.bodyBold, fontSize: 16, color: color.deck },
  done: { minHeight: minTouch, flexDirection: "row", alignItems: "center", gap: 6 },
  doneText: { fontFamily: font.bodyBold, fontSize: 15, color: color.pen },
  toastWrap: { position: "absolute", left: 0, right: 0, height: 0 },
});
