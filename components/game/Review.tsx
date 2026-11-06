import { Pressable, StyleSheet, Text, View } from "react-native";
import { useReviewTopic, type TopicFull } from "@/lib/queries/review";
import { bossStatus, daysUntil, isMastered, nodeState, type ExamRow } from "@/lib/review";
import { color, font, minTouch, rarity, space } from "@/lib/theme";

// บอสสอบ + passive tree + ปุ่ม "ทวนแล้ว" (ขั้น 5 · mockup stage0.html หน้า 4 + stage5.html)

const KIND = { midterm: "กลางภาค", final: "ปลายภาค" } as const;

/** หัวข้อที่ยังไม่ "lit" พร้อมปุ่มทวน (optimistic) */
export function ReviewRow({ topic, termId }: { topic: TopicFull; termId: string }) {
  const review = useReviewTopic(termId);
  const state = nodeState(topic);
  return (
    <View style={s.li}>
      <Text style={[s.mark, { color: topic.is_starred ? rarity.rare : rarity.normal }]}>{topic.is_starred ? "★" : "•"}</Text>
      <Text style={s.topic} numberOfLines={2}>{topic.title}</Text>
      {state === "lit" ? (
        <Text style={s.small}>ทวนแล้ว ✓</Text>
      ) : (
        <>
          <Text style={s.small}>{state === "fading" ? "เลยรอบ" : "ยังไม่ทวน"}</Text>
          <Pressable style={s.rv} onPress={() => review.mutate(topic.id)} accessibilityRole="button"
            accessibilityLabel={`ทวน ${topic.title} แล้ว`}>
            <Text style={s.rvText}>ทวนแล้ว</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

export function BossPanel({ exam, subjectName, topics, termId, today }: {
  exam: ExamRow; subjectName: string; topics: TopicFull[]; termId: string; today: string;
}) {
  const boss = bossStatus(topics);
  const stars = topics.filter((t) => t.is_starred).length;
  const missing = boss.missing;
  return (
    <View style={[s.panel, { borderColor: color.bossLine }]}>
      <View style={s.between}>
        <Text style={s.h3}>บอส{KIND[exam.kind]} · {subjectName}</Text>
        <Text style={s.dcount}>D-{daysUntil(exam.date, today)}</Text>
      </View>
      <Text style={s.small}>สอบ {exam.date} · {topics.length} หัวข้อ{stars ? ` (★ ${stars} นับ 2 เท่า)` : ""}</Text>
      <View style={[s.bar, { height: 12 }]}>
        <View style={[s.fill, { backgroundColor: color.hp, transform: [{ scaleX: boss.maxHp ? boss.hp / boss.maxHp : 0 }] }]} />
      </View>
      <Text style={[s.small, s.px]}>HP {boss.hp} / {boss.maxHp}</Text>
      <View style={s.ready}>
        <Text style={s.pct}>{boss.ready}%</Text>
        <Text style={s.small}>พร้อมสอบ</Text>
      </View>
      {topics.length === 0 ? (
        <Text style={[s.small, { marginTop: space.sm }]}>ยังไม่มีหัวข้อของบอสนี้ — เพิ่มหัวข้อตอนจดหลังคาบ</Text>
      ) : missing.length === 0 ? (
        <Text style={[s.small, { marginTop: space.sm }]}>ทวนครบทุกหัวข้อแล้ว บอสไม่เหลือเลือด</Text>
      ) : (
        missing.slice(0, 6).map((t) => <ReviewRow key={t.id} topic={t} termId={termId} />)
      )}
      {missing.length > 6 && <Text style={[s.small, { marginTop: 4 }]}>และอีก {missing.length - 6} หัวข้อ (ดูใน passive tree)</Text>}
    </View>
  );
}

/** โหนดเรียงตามลำดับที่จด · ⭐ = โหนดใหญ่ · สว่าง = ทวนแล้ว · จาง = เลยรอบ · มืด = ยังไม่ทวน · ส้ม = ทวนครบทุกรอบ */
export function PassiveTree({ topics }: { topics: TopicFull[] }) {
  if (topics.length === 0) return <Text style={s.small}>ยังไม่มีหัวข้อ — เพิ่มหัวข้อตอนจดหลังคาบ</Text>;
  const states = topics.map((t) => nodeState(t));
  return (
    <View>
      <View style={s.tree}>
        {topics.map((t, i) => {
          const st = states[i];
          const size = t.is_starred ? 24 : 14;
          const fill = st === "dark" ? color.gameDeep : isMastered(t) ? rarity.unique : t.is_starred ? rarity.rare : color.brass;
          return (
            <View key={t.id} style={s.nodeWrap}>
              {i > 0 && <View style={[s.link, { backgroundColor: st === "lit" && states[i - 1] === "lit" ? color.brass : color.gameLine }]} />}
              <View accessible accessibilityLabel={`${t.title} · ${st === "lit" ? "ทวนแล้ว" : st === "fading" ? "เลยรอบทวน" : "ยังไม่ทวน"}`}
                style={{
                  width: size, height: size, borderRadius: size / 2, backgroundColor: fill,
                  borderWidth: 2, borderColor: st === "dark" ? color.gameLine : t.is_starred ? color.white : fill,
                  opacity: st === "fading" ? 0.45 : 1,
                }} />
            </View>
          );
        })}
      </View>
      <Text style={[s.small, { marginTop: space.sm }]}>สว่าง = ทวนแล้ว · จาง = เลยรอบทวน · มืด = ยังไม่ทวน · วงใหญ่ = หัวข้อ ★ · ส้ม = ทวนครบทุกรอบ</Text>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { backgroundColor: color.gamePanel, borderWidth: 1, borderColor: color.gameLine, borderRadius: 4, padding: space.md, marginBottom: space.md },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  h3: { fontFamily: font.heading, fontSize: 16, color: color.white, flex: 1 },
  dcount: { fontFamily: font.pixel, fontSize: 13, color: color.white, backgroundColor: color.bossLine, paddingHorizontal: 8, paddingVertical: 2 },
  small: { fontFamily: font.body, fontSize: 12, color: color.gameSub },
  px: { fontFamily: font.pixel, marginTop: 4 },
  bar: { backgroundColor: color.gameDeep, borderWidth: 1, borderColor: color.gameLine, marginTop: 6, overflow: "hidden" },
  fill: { height: "100%", width: "100%", transformOrigin: "left" },
  ready: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm },
  pct: { fontFamily: font.pixel, fontSize: 22, color: color.brass },
  li: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: minTouch, borderTopWidth: 1, borderTopColor: color.gameLine, marginTop: 4 },
  mark: { fontSize: 14, width: 16, textAlign: "center" },
  topic: { flex: 1, fontFamily: font.body, fontSize: 14, color: color.gameText },
  rv: { minHeight: minTouch, paddingHorizontal: space.md, backgroundColor: color.brass, borderRadius: 4, justifyContent: "center" },
  rvText: { fontFamily: font.bodyBold, fontSize: 13, color: color.ink },
  tree: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: space.md },
  nodeWrap: { flexDirection: "row", alignItems: "center" },
  link: { width: 18, height: 3 },
});
