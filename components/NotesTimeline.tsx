import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, T } from "@/components/ui";
import { PhotoViewer } from "@/components/PhotoViewer";
import { EmptyScene } from "@/components/EmptyScene";
import { useSubjectNotes } from "@/lib/queries/notes";
import { signedUrls, thumbPath } from "@/lib/photos";
import { thaiDate } from "@/lib/format";
import { color, font, radius, space } from "@/lib/theme";

/**
 * ไทม์ไลน์โน้ตทุกคาบของวิชา (ใหม่สุดก่อน) · แตะเพื่อแก้ · absentKeys = "slotId:date" ที่เช็กว่าขาด
 * focusTopic = หัวข้อที่กำลังทวน → ไฮไลต์คาบนั้น + บอกตำแหน่ง y ผ่าน onFocusY (ให้หน้าเลื่อนไปหา)
 */
export function NotesTimeline({ subjectId, subjectName, absentKeys, focusTopic, onFocusY }: {
  subjectId: string; subjectName: string; absentKeys: Set<string>; focusTopic?: string; onFocusY?: (y: number) => void;
}) {
  const notes = useSubjectNotes(subjectId);
  const [viewing, setViewing] = useState<{ noteId: string; index: number } | null>(null);
  const allThumbs = (notes.data ?? []).flatMap((n) => n.photo_paths.map(thumbPath));
  const thumbs = useQuery({
    queryKey: ["thumbs-subject", subjectId, allThumbs.join("|")],
    enabled: allThumbs.length > 0,
    queryFn: () => signedUrls(allThumbs),
    staleTime: 50 * 60_000,
  });

  if (notes.isPending) return <Skeleton height={120} />;
  if (!notes.data?.length) return <Card><EmptyScene kind="notes" fact="ยังไม่มีโน้ต · จดได้จากการ์ด “ยังไม่ได้จด” ในหน้าวันนี้หลังเลิกคาบ" /></Card>;

  const open = viewing && notes.data.find((n) => n.id === viewing.noteId);

  return (
    <View style={s.tl}>
      <View style={s.line} />
      {notes.data.map((n) => {
        const absent = n.slot_id ? absentKeys.has(`${n.slot_id}:${n.date}`) : false;
        const focused = !!focusTopic && n.topics.some((t) => t.id === focusTopic);
        return (
          <View key={n.id} style={s.item} onLayout={focused && onFocusY ? (e) => onFocusY(e.nativeEvent.layout.y) : undefined}>
            <View style={[s.dot, absent && { backgroundColor: color.danger }]} />
            <Card style={[{ marginBottom: 0 }, focused && s.focus]}>
              {/* รูปอยู่นอกปุ่มแก้โน้ต: ปุ่มซ้อนปุ่มไม่ได้ในเว็บ */}
              <Pressable
                disabled={!n.slot_id}
                onPress={() => n.slot_id && router.push({ pathname: "/note/[slotId]", params: { slotId: n.slot_id, date: n.date } })}
                accessibilityRole="button" accessibilityLabel={`แก้โน้ต ${thaiDate(n.date)}`}
              >
                <Text style={T.muted}>
                  {thaiDate(n.date)}
                  {absent && <Text style={{ color: color.danger, fontFamily: font.bodyBold }}> · ขาด</Text>}
                </Text>
                {/* หัวข้อ = หัวการ์ด ตัวหนา · อันที่กำลังทวนเป็นสีปากกาน้ำเงิน */}
                {n.topics.map((t) => (
                  <Text key={t.id} style={[s.topicHead, t.id === focusTopic && { color: color.pen }]}>
                    {t.is_starred && <Text style={{ color: color.red }}>★ </Text>}{t.title}
                  </Text>
                ))}
                {!!n.text && <Text style={[T.body, { marginTop: 4 }]}>{n.text}</Text>}
                {!!n.next_text && <Text style={[T.muted, { marginTop: 4 }]}>คาบหน้า: {n.next_text}</Text>}
              </Pressable>
              {n.photo_paths.length > 0 && (
                <View style={s.photos}>
                  {n.photo_paths.map((p, i) => {
                    const uri = thumbs.data?.[thumbPath(p)];
                    return (
                      <Pressable key={p} onPress={() => setViewing({ noteId: n.id, index: i })}
                        accessibilityRole="button" accessibilityLabel={`ดูรูปที่ ${i + 1} จาก ${n.photo_paths.length}`}>
                        {uri ? <Image source={{ uri }} style={s.thumb} /> : <View style={s.thumb} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Card>
          </View>
        );
      })}
      {viewing && open && (
        <PhotoViewer title={`${subjectName} · ${thaiDate(open.date)}`} index={viewing.index}
          photos={open.photo_paths.map((p) => ({ id: p, thumb: thumbs.data?.[thumbPath(p)] }))}
          onIndex={(index) => setViewing({ noteId: open.id, index })} onClose={() => setViewing(null)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tl: { paddingLeft: 18, marginBottom: space.md },
  line: { position: "absolute", left: 5, top: 6, bottom: 6, width: 2, backgroundColor: color.rule },
  item: { marginBottom: space.md },
  dot: {
    position: "absolute", left: -18, top: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: color.pen,
    borderWidth: 2, borderColor: color.ink,
  },
  topicHead: { fontFamily: font.bodyBold, fontSize: 17, lineHeight: 24, color: color.paper, marginTop: 4 },
  // พื้นคงทึบ (deck) ให้อ่านง่าย · บอกคาบที่ทวนด้วยขอบปากกาน้ำเงินอย่างเดียว
  focus: { borderColor: color.pen, borderWidth: 2 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  thumb: { width: 72, height: 56, borderRadius: radius.sm, backgroundColor: color.rule },
});
