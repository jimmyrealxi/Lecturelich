import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bar, Frame } from "@/components/game/Frame";
import { useReviewTopic, type TopicFull } from "@/lib/queries/review";
import { bossStatus, daysUntil, isMastered, nodeState, type ExamRow } from "@/lib/review";
import { shortDate } from "@/lib/format";
import { bangkokNow } from "@/lib/schedule";
import { color, font, minTouch, rarity, space } from "@/lib/theme";

// บอสสอบ + passive tree + ปุ่ม "ทวนแล้ว" (ขั้น 5 · หน้าตาตาม b5-game.html)

export const KIND = { midterm: "กลางภาค", final: "ปลายภาค" } as const;

/** บรรทัดสถานะใต้ชื่อหัวข้อ: ยังไม่ทวน / เลยรอบทวน N วัน / ทวนแล้ว · รอบถัดไป ... */
export function statusOf(t: TopicFull, today: string) {
  const st = nodeState(t);
  if (st === "dark") return { text: "ยังไม่ทวน", late: false };
  const next = bangkokNow(new Date(t.next_review_at!)).date;
  if (st === "fading") return { text: `เลยรอบทวน ${Math.max(1, -daysUntil(next, today))} วัน`, late: true };
  return { text: `ทวนแล้ว · รอบถัดไป ${shortDate(next)}`, late: false };
}

/** แถวหัวข้อ พร้อมปุ่มทวน (optimistic) · ทวนแล้ว = ไม่มีปุ่ม */
export function ReviewRow({ topic, termId }: { topic: TopicFull; termId: string }) {
  const review = useReviewTopic(termId);
  const lit = nodeState(topic) === "lit";
  const st = statusOf(topic, bangkokNow().date);
  return (
    <View style={s.li}>
      <Text style={[s.mark, { color: lit ? color.gold : topic.is_starred ? rarity.rare : rarity.normal }]}>
        {topic.is_starred ? "★" : lit ? "●" : "•"}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={s.topic} numberOfLines={2}>{topic.title}</Text>
        <Text style={[s.small, st.late && { color: color.bossSoft }]}>{st.text}</Text>
      </View>
      {!lit && (
        <Pressable style={s.rv} onPress={() => review.mutate(topic.id)} accessibilityRole="button"
          accessibilityLabel={`ทวน ${topic.title} แล้ว`}>
          <Text style={s.rvText}>ทวนแล้ว</Text>
        </Pressable>
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
    <Frame boss>
      <View style={s.in}>
        <View style={s.between}>
          <Text style={s.h3}>บอส{KIND[exam.kind]} · {subjectName}</Text>
          <Text style={s.dd}>D-{daysUntil(exam.date, today)}</Text>
        </View>
        <Text style={s.small}>สอบ {shortDate(exam.date)} · {topics.length} หัวข้อ{stars ? ` (★ ${stars} นับ 2 เท่า)` : ""}</Text>
        <View accessible accessibilityRole="progressbar" accessibilityLabel="เลือดบอส"
          accessibilityValue={{ now: boss.hp, min: 0, max: boss.maxHp }}>
          <Bar value={boss.maxHp ? boss.hp / boss.maxHp : 0} tint={color.blood} line={color.bossLine} height={12} />
        </View>
        <View style={s.hpn}>
          <Text style={s.small}>HP <Text style={s.hpv}>{boss.hp} / {boss.maxHp}</Text></Text>
          <Text style={s.small}><Text style={s.pct}>{boss.ready}%</Text> พร้อมสอบ</Text>
        </View>
        <View style={{ marginTop: 10 }}>
          {topics.length === 0 ? (
            <Text style={s.small}>ยังไม่มีหัวข้อของบอสนี้ — เพิ่มหัวข้อตอนจดหลังคาบ</Text>
          ) : missing.length === 0 ? (
            <Text style={s.small}>ทวนครบทุกหัวข้อแล้ว บอสไม่เหลือเลือด</Text>
          ) : (
            missing.slice(0, 3).map((t) => <ReviewRow key={t.id} topic={t} termId={termId} />)
          )}
        </View>
        {missing.length > 3 && <Text style={[s.small, { paddingTop: space.sm }]}>และอีก {missing.length - 3} หัวข้อ (ดูใน passive tree)</Text>}
      </View>
    </Frame>
  );
}

/** โหนดเรียงตามลำดับที่จด · ★ = โหนดใหญ่ · ทอง = ทวนแล้ว · จาง = เลยรอบ · มืด = ยังไม่ทวน · ส้ม = ทวนครบทุกรอบ */
export function PassiveTree({ topics }: { topics: TopicFull[] }) {
  if (topics.length === 0) return <Text style={[s.small, s.in]}>ยังไม่มีหัวข้อ — เพิ่มหัวข้อตอนจดหลังคาบ</Text>;
  const states = topics.map((t) => nodeState(t));
  const n = (k: string) => states.filter((x) => x === k).length;
  return (
    <View>
      <View style={s.tree} accessibilityLabel={`${topics.length} หัวข้อ: ทวนแล้ว ${n("lit")} เลยรอบ ${n("fading")} ยังไม่ทวน ${n("dark")}`}>
        {topics.map((t, i) => {
          const st = states[i];
          const size = t.is_starred ? 24 : 14;
          const fill = st === "dark" ? color.gameDeep : isMastered(t) ? rarity.unique : t.is_starred && st === "lit" ? rarity.rare : color.gold;
          return (
            <View key={t.id} style={s.nodeWrap}>
              {i > 0 && <View style={[s.link, { backgroundColor: st === "lit" && states[i - 1] === "lit" ? color.gold : color.seam2 }]} />}
              <View style={{
                width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderWidth: 2,
                borderColor: t.is_starred ? color.bone : st === "dark" ? color.seam2 : fill, opacity: st === "fading" ? 0.45 : 1,
              }} />
            </View>
          );
        })}
      </View>
      <View style={s.tkey}>
        {([[color.gold, "ทวนแล้ว"], [rarity.unique, "ครบทุกรอบ"], [color.seam2, "จาง = เลยรอบ"], [color.gameDeep, "มืด = ยังไม่ทวน"]] as const).map(([c, l]) => (
          <View key={l} style={s.key}><View style={[s.dot, { backgroundColor: c }]} /><Text style={s.small}>{l}</Text></View>
        ))}
        <Text style={s.small}>ใหญ่ = ★</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  in: { paddingVertical: space.md, paddingHorizontal: 14 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.sm },
  h3: { fontFamily: font.bodyBold, fontSize: 16, color: color.bossText, flex: 1 },
  dd: { fontFamily: font.pixel, fontSize: 20, color: color.bossNum },
  small: { fontFamily: font.body, fontSize: 14, color: color.ash },
  hpn: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 },
  hpv: { fontFamily: font.pixel, fontSize: 14, color: color.bossSoft },
  pct: { fontFamily: font.pixel, fontSize: 24, color: color.gold },
  li: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 56, paddingVertical: 6, borderTopWidth: 1, borderTopColor: color.seam },
  mark: { fontSize: 14, width: 16, textAlign: "center" },
  topic: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.bone },
  rv: { minHeight: minTouch, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.gold, justifyContent: "center" },
  rvText: { fontFamily: font.bodyBold, fontSize: 14, color: color.gold },
  tree: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 14, paddingTop: space.lg, paddingHorizontal: 10, paddingBottom: space.md },
  nodeWrap: { flexDirection: "row", alignItems: "center" },
  link: { width: 14, height: 2 },
  tkey: { flexDirection: "row", flexWrap: "wrap", columnGap: space.md, rowGap: 4, paddingHorizontal: 14, paddingBottom: 10 },
  key: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: color.seam2 },
});
