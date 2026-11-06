import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, T } from "@/components/ui";
import { useSubjectNotes } from "@/lib/queries/notes";
import { signedUrls, thumbPath } from "@/lib/photos";
import { thaiDate } from "@/lib/format";
import { color, font, radius, space } from "@/lib/theme";

/** ไทม์ไลน์โน้ตทุกคาบของวิชา (ใหม่สุดก่อน) · แตะเพื่อแก้ · absentKeys = "slotId:date" ที่เช็กว่าขาด */
export function NotesTimeline({ subjectId, absentKeys }: { subjectId: string; absentKeys: Set<string> }) {
  const notes = useSubjectNotes(subjectId);
  const allThumbs = (notes.data ?? []).flatMap((n) => n.photo_paths.map(thumbPath));
  const thumbs = useQuery({
    queryKey: ["thumbs-subject", subjectId, allThumbs.join("|")],
    enabled: allThumbs.length > 0,
    queryFn: () => signedUrls(allThumbs),
    staleTime: 50 * 60_000,
  });

  if (notes.isPending) return <Skeleton height={120} />;
  if (!notes.data?.length) return <Card><Text style={T.muted}>ยังไม่มีโน้ต · จดได้จากการ์ด “ยังไม่ได้จด” ในหน้าวันนี้หลังเลิกคาบ</Text></Card>;

  return (
    <View style={s.tl}>
      <View style={s.line} />
      {notes.data.map((n) => {
        const absent = n.slot_id ? absentKeys.has(`${n.slot_id}:${n.date}`) : false;
        return (
          <View key={n.id} style={s.item}>
            <View style={[s.dot, absent && { backgroundColor: color.danger }]} />
            <Pressable
              disabled={!n.slot_id}
              onPress={() => n.slot_id && router.push({ pathname: "/note/[slotId]", params: { slotId: n.slot_id, date: n.date } })}
              accessibilityRole="button" accessibilityLabel={`แก้โน้ต ${thaiDate(n.date)}`}
            >
              <Card style={{ marginBottom: 0 }}>
                <Text style={T.muted}>
                  {thaiDate(n.date)}
                  {absent && <Text style={{ color: color.danger, fontFamily: font.bodyBold }}> · ขาด</Text>}
                </Text>
                {!!n.text && <Text style={[T.body, { marginTop: 4 }]}>{n.text}</Text>}
                {n.topics.length > 0 && (
                  <View style={s.topics}>
                    {n.topics.map((t) => (
                      <View key={t.id} style={[s.topic, t.is_starred && s.topicStar]}>
                        <Text style={[s.topicText, t.is_starred && { fontFamily: font.bodyBold }]}>{t.is_starred ? "★ " : ""}{t.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {n.photo_paths.length > 0 && (
                  <View style={s.photos}>
                    {n.photo_paths.map((p) => {
                      const uri = thumbs.data?.[thumbPath(p)];
                      return uri ? <Image key={p} source={{ uri }} style={s.thumb} /> : <View key={p} style={s.thumb} />;
                    })}
                  </View>
                )}
              </Card>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  tl: { paddingLeft: 18, marginBottom: space.md },
  line: { position: "absolute", left: 5, top: 6, bottom: 6, width: 2, backgroundColor: color.line },
  item: { marginBottom: space.md },
  dot: {
    position: "absolute", left: -18, top: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: color.blue,
    borderWidth: 2, borderColor: color.cream,
  },
  topics: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  topic: { backgroundColor: color.cream, borderWidth: 1, borderColor: color.line, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  topicStar: { borderColor: color.ink },
  topicText: { fontFamily: font.body, fontSize: 12, color: color.ink },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  thumb: { width: 56, height: 42, borderRadius: radius.sm, backgroundColor: color.line },
});
