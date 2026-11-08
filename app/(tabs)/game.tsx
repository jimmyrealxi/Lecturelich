import { useTabTop } from "@/lib/useTabTop";
import { useState } from "react";
import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BossScene } from "@/components/game/BossScene";
import { Bar, Frame, H } from "@/components/game/Frame";
import { BossPanel, PassiveTree, ReviewRow } from "@/components/game/Review";
import { termBoss } from "@/lib/boss";
import { DEFAULT_LOOK, itemById, RARITY_COLOR, type Look } from "@/lib/papboy";
import { PapBoySprite } from "@/components/game/PapBoySprite";
import { ascById, classById } from "@/lib/classes";
import { thaiDate } from "@/lib/format";
import { useClassState, type ClassState } from "@/lib/queries/classes";
import { TitleList } from "@/components/game/TitleList";
import { TITLES } from "@/lib/titles";
import { useLoot, useTitles } from "@/lib/queries/loot";
import { useCurrentTerm } from "@/lib/queries/core";
import { useExams, useTopics } from "@/lib/queries/review";
import { useXp, useXpToday } from "@/lib/queries/xp";
import { daysUntil, examOf, upcomingExams } from "@/lib/review";
import { bangkokNow } from "@/lib/schedule";
import { color, font, minTouch, rarity, space } from "@/lib/theme";
import { XP_CONFIG } from "@/lib/xp";

// หน้าเกม "อีกโลก" ตาม docs/mockups/b5-game.html · Pap-Boy + บอสประจำเทอม บนสุด · สอบที่ใกล้ที่สุด · passive tree · ได้วันนี้ · LV วิชา

const KIND = { midterm: "กลางภาค", final: "ปลายภาค" } as const;

function ClassStrip({ st, look }: { st: ClassState; look: Look }) {
  const k = classById(st.class_id), a = ascById(st.ascendancy_id);
  const can = !k || (st.asc_open && !a); // มีอะไรให้เลือกตอนนี้ ถึงกดได้
  const name = a?.name ?? k?.name ?? "ยังไม่ได้เลือกคลาส";
  const sub = !k ? "เลือกคลาสเทอมนี้ ›" : a ? `สายย่อยของ${k.name}` : st.asc_open ? "เลือกสายย่อยได้แล้ว ›" : st.asc_on ? `เลือกสายย่อยได้ ${thaiDate(st.asc_on)}` : k.vibe;
  const body = (
    <>
      <PapBoySprite look={look} size={64} label="" />
      <View style={{ flex: 1 }}>
        <Text style={s.clsN}>{name}</Text>
        <Text style={[s.small, can && { color: color.gold }]}>{sub}</Text>
      </View>
    </>
  );
  return can
    ? <Pressable style={s.clsS} onPress={() => router.push("/class" as Href)} accessibilityRole="button">{body}</Pressable>
    : <View style={s.clsS}>{body}</View>;
}

export default function Game() {
  const top = useTabTop();
  const q = useXp();
  const d = q.data;
  const term = useCurrentTerm();
  const topics = useTopics(term.data?.id).data ?? [];
  const exams = useExams(term.data?.id).data ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const today = bangkokNow().date;
  const xpToday = useXpToday(today).data;
  const loot = useLoot().data; // undefined = ยังไม่รัน migration ขั้น 7 / ออฟไลน์ → ซ่อนส่วนกล่อง
  const titles = useTitles().data;
  const cls = useClassState().data; // undefined = ยังไม่รัน migration ขั้น 9 → ซ่อนแถบคลาส
  const [pickTitle, setPickTitle] = useState(false);

  const next = upcomingExams(exams, today);
  const boss = next[0];
  const nameOf = (id: string) => d?.subjects.find((x) => x.subject_id === id)?.name ?? "";
  const topicsOf = (id: string) => topics.filter((t) => t.subject_id === id);
  const midtermOf = (id: string) => exams.find((e) => e.subject_id === id && e.kind === "midterm")?.date ?? null;
  const treeId = picked ?? boss?.subject_id ?? d?.subjects[0]?.subject_id ?? null;
  const treeTopics = treeId ? topicsOf(treeId) : [];

  if (!d) {
    return (
      <ScrollView ref={top} style={s.page} contentContainerStyle={s.content}>
        <View style={[s.skel, { height: 200 }]} />
        <View style={[s.skel, { height: 120, marginTop: space.md }]} />
        {q.isError && <Text style={[s.small, s.pad]}>โหลดข้อมูลเกมไม่สำเร็จ (ลองรีเฟรช)</Text>}
      </ScrollView>
    );
  }

  const finals = exams.filter((e) => e.kind === "final").map((e) => e.date).sort();
  const mids = exams.filter((e) => e.kind === "midterm").map((e) => e.date).sort();
  const look = loot?.look ?? DEFAULT_LOOK;
  const tb = term.data
    ? termBoss({
        start: term.data.start_date, lastExam: finals.at(-1) ?? term.data.end_date, midterm: mids.at(-1) ?? null, today,
        termXp: d.subjects.reduce((n, x) => n + x.xp, 0),
      })
    : null;
  const finalsLeft = finals.filter((x) => x >= today).length;
  const title = TITLES.find((t) => t.id === titles?.current) ?? TITLES[0];

  return (
    <ScrollView ref={top} style={s.page} contentContainerStyle={s.content}>
      {tb && term.data && (
        <BossScene look={look} stage={tb.stage} title={`อสูรกองข้อสอบ · ${term.data.name}`} pct={tb.pct} phase={tb.phase}
          note={tb.dead ? "ล้มแล้ว · ได้กล่องทอง" : tb.stage === "end" && finalsLeft > 0 ? `ใกล้ตาย · สอบปลายภาคเหลือ ${finalsLeft} วิชา` : "ตายเมื่อสอบปลายภาคครบทุกวิชา"} />
      )}
      <View style={s.who}>
        <View>
          <Text style={s.lvSmall}>LV</Text>
          <Text style={s.lvBig}>{d.total.level}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.nm}>
            <Text style={s.name}>Pap-Boy</Text>
            <Text style={s.xpn}>XP {d.total.into}/{d.total.need}</Text>
          </View>
          {titles ? (
            <Pressable style={s.titleBtn} onPress={() => setPickTitle((v) => !v)} accessibilityRole="button"
              accessibilityLabel={`ฉายา ${title.name} กดเพื่อเปลี่ยน`} aria-expanded={pickTitle}>
              <Text style={[s.title, { color: RARITY_COLOR[title.r] }]}>{title.name}</Text>
              <Text style={s.small}>เปลี่ยน ›</Text>
            </Pressable>
          ) : (
            <Text style={[s.title, { color: RARITY_COLOR[title.r] }]}>ฉายา: {title.name}</Text>
          )}
          <Bar value={d.total.into / d.total.need} />
        </View>
      </View>
      {pickTitle && titles && <View style={{ marginTop: space.md }}><TitleList state={titles} onPicked={() => setPickTitle(false)} /></View>}

      {cls?.term_id && <ClassStrip st={cls} look={look} />}

      {loot && (
        <View style={s.acts}>
          <Pressable style={s.btn} onPress={() => router.push("/wardrobe")} accessibilityRole="button">
            <Text style={s.btnT}>แต่งตัว</Text>
          </Pressable>
          <Pressable style={[s.btn, s.gold]} onPress={() => router.push("/lootbox")} accessibilityRole="button"
            accessibilityLabel={`เปิดกล่อง รอเปิด ${loot.boxes.length} กล่อง`}>
            <Text style={[s.btnT, { color: color.gold }]}>เปิดกล่อง</Text>
            {loot.boxes.length > 0 && <Text style={s.badge}>{loot.boxes.length}</Text>}
          </Pressable>
        </View>
      )}

      {term.data && (
        <>
          <H>สอบที่ใกล้ที่สุด</H>
          {!boss ? (
            <Frame><Text style={[s.small, s.in]}>ยังไม่มีวันสอบ — ตั้งวันสอบได้ในหน้าวิชา</Text></Frame>
          ) : (
            <BossPanel exam={boss} subjectName={nameOf(boss.subject_id)} termId={term.data.id} today={today}
              topics={topicsOf(boss.subject_id).filter(
                (t) => examOf(t.exam, t.note_date, midtermOf(boss.subject_id)) === boss.kind,
              )} />
          )}
          {next.length > 1 && (
            <Text style={[s.small, s.next]}>
              บอสถัดไป: {next.slice(1, 3).map((e, i) => (
                <Text key={i}>{i ? " · " : ""}{KIND[e.kind]} {nameOf(e.subject_id)} <Text style={s.nextD}>D-{daysUntil(e.date, today)}</Text></Text>
              ))}
            </Text>
          )}

          {d.subjects.length > 0 && (
            <>
              <H>Passive tree</H>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}
                accessibilityRole="radiogroup" accessibilityLabel="เลือกวิชา">
                {d.subjects.map((sub) => {
                  const on = sub.subject_id === treeId;
                  return (
                    <Pressable key={sub.subject_id} onPress={() => setPicked(sub.subject_id)} accessibilityRole="radio"
                      accessibilityState={{ checked: on }} style={[s.chip, on && s.chipOn]}>
                      <Text style={[s.chipT, on && { color: color.gold }]}>{sub.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Frame>
                <PassiveTree topics={treeTopics} />
                {treeTopics.length > 0 && (
                  <View style={[s.in, { paddingTop: 0 }]}>
                    {treeTopics.slice(0, 8).map((t) => <ReviewRow key={t.id} topic={t} termId={term.data!.id} />)}
                    {treeTopics.length > 8 && <Text style={[s.small, { paddingTop: space.sm }]}>และอีก {treeTopics.length - 8} หัวข้อ</Text>}
                  </View>
                )}
              </Frame>
            </>
          )}
        </>
      )}

      <H>ได้วันนี้</H>
      <Frame>
        <View style={s.loot}>
          <Text style={[s.ic, { color: color.gold, borderColor: color.gold }]}>+</Text>
          <Text style={[s.body, { flex: 1 }]}>XP วันนี้</Text>
          <Text style={s.lootN}>{xpToday ? `+${xpToday.xp}` : "—"}</Text>
        </View>
        {!!loot?.today_boxes && (
          <View style={[s.loot, s.sep]}>
            <Text style={[s.ic, { color: color.gold, borderColor: color.gold }]}>▣</Text>
            <Text style={[s.body, { flex: 1 }]}>กล่องใหม่</Text>
            <Text style={s.lootN}>×{loot.today_boxes}</Text>
          </View>
        )}
        {loot?.today_items.map((id) => {
          const it = itemById(id);
          if (!it) return null;
          const c = RARITY_COLOR[it.r];
          return (
            <View key={id} style={[s.loot, s.sep]}>
              <Text style={[s.ic, { color: c, borderColor: c }]}>◆</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.body, { color: c }]}>{it.name}</Text>
                <Text style={s.small}>{it.slot}{loot.look[it.k] === it.v ? " · ใส่อยู่" : ""}</Text>
              </View>
            </View>
          );
        })}
      </Frame>

      <H>วิชา · ซีซั่นเทอมนี้</H>
      {d.subjects.length === 0 ? (
        <Text style={[s.small, s.pad]}>ยังไม่มีวิชาในเทอมนี้</Text>
      ) : (
        <View style={s.grid}>
          {d.subjects.map((sub) => (
            <Frame key={sub.subject_id} style={s.cell}>
              <Text style={[s.body, { fontSize: 14 }]} numberOfLines={1}>{sub.name}</Text>
              <Text style={s.cellLv}>LV {sub.level}</Text>
              <Bar value={sub.into / sub.need} />
              <Text style={s.xpn}>{sub.into}/{sub.need}</Text>
            </Frame>
          ))}
        </View>
      )}

      <H>ได้ XP จาก</H>
      <Frame>
        <View style={s.in}>
          <Text style={s.small}>
            มาเรียน <Text style={s.gv}>+{XP_CONFIG.attend}</Text> · จดหลังคาบ <Text style={s.gv}>+{XP_CONFIG.note}</Text> (มีรูป{" "}
            <Text style={s.gv}>+{XP_CONFIG.notePhoto}</Text>) · ส่งงานก่อนกำหนด 1 วัน <Text style={s.gv}>+{XP_CONFIG.submitEarly}</Text> · ตรงเวลา{" "}
            <Text style={s.gv}>+{XP_CONFIG.submitOnTime}</Text> · ทวนหัวข้อ <Text style={s.gv}>+{XP_CONFIG.review}</Text> (ไม่เกิน {XP_CONFIG.reviewDailyCap}/วัน)
          </Text>
          <Text style={[s.small, { marginTop: 6 }]}>แต่ละวิชาได้ไม่เกิน {XP_CONFIG.dailyCapPerSubject} XP ต่อวัน · เลเวลวิชาเริ่มใหม่ทุกเทอม ตัวละครไม่รีเซ็ต</Text>
        </View>
      </Frame>

      <H>สีความหายาก</H>
      <View style={s.legend}>
        {([["normal", "ปกติ"], ["magic", "magic"], ["rare", "rare"], ["unique", "unique"]] as const).map(([k, label]) => (
          <View key={k} style={s.key}><View style={[s.sq, { backgroundColor: rarity[k] }]} /><Text style={[s.small, { color: rarity[k] }]}>{label}</Text></View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { backgroundColor: color.cave },
  clsS: { flexDirection: "row", alignItems: "center", gap: space.sm, marginHorizontal: space.md, marginTop: space.md, paddingRight: space.md, minHeight: minTouch, backgroundColor: color.gamePanel, borderWidth: 1, borderColor: color.seam },
  clsN: { fontFamily: font.title, fontSize: 18, lineHeight: 27, color: color.bone },
  content: { paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  skel: { marginHorizontal: space.md, backgroundColor: color.gamePanel, opacity: 0.6 },
  pad: { paddingHorizontal: space.lg },
  in: { paddingVertical: space.md, paddingHorizontal: 14 },
  small: { fontFamily: font.body, fontSize: 14, color: color.ash },
  body: { fontFamily: font.body, fontSize: 15, color: color.bone },
  who: { flexDirection: "row", gap: 14, alignItems: "center", paddingTop: 10, paddingHorizontal: space.lg, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: color.seam },
  lvSmall: { fontFamily: font.pixel, fontSize: 11, color: color.ash, letterSpacing: 1 },
  lvBig: { fontFamily: font.pixel, fontSize: 34, lineHeight: 38, color: color.gold },
  nm: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.sm },
  name: { fontFamily: font.bodyBold, fontSize: 18, color: color.bone },
  xpn: { fontFamily: font.pixel, fontSize: 12, color: color.ash, marginTop: 2 },
  title: { fontFamily: font.bodyBold, fontSize: 14 },
  titleBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: minTouch },
  next: { paddingTop: space.sm, paddingHorizontal: space.lg },
  nextD: { fontFamily: font.pixel, fontSize: 13, color: color.bossSoft },
  chips: { gap: 6, paddingHorizontal: space.md, paddingBottom: 10 },
  chip: { minHeight: minTouch, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.seam2, justifyContent: "center" },
  chipOn: { borderColor: color.gold, backgroundColor: color.gamePanel },
  chipT: { fontFamily: font.bodyMedium, fontSize: 14, color: color.bone },
  sep: { borderTopWidth: 1, borderTopColor: color.seam },
  acts: { flexDirection: "row", gap: space.sm, paddingTop: space.md, paddingHorizontal: space.lg },
  btn: { flex: 1, flexDirection: "row", gap: 6, minHeight: minTouch, borderWidth: 1, borderColor: color.seam2, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  gold: { borderColor: color.gold, backgroundColor: color.gamePanel },
  btnT: { fontFamily: font.bodyBold, fontSize: 15, color: color.bone },
  badge: { minWidth: 22, paddingHorizontal: 5, textAlign: "center", backgroundColor: color.gold, color: color.gameDeep, fontFamily: font.pixel, fontSize: 13, lineHeight: 20 },
  loot: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, minHeight: 52 },
  ic: { width: 26, height: 26, borderWidth: 1, textAlign: "center", lineHeight: 24, fontFamily: font.pixel, fontSize: 14 },
  lootN: { fontFamily: font.pixel, fontSize: 15, color: color.gold },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginHorizontal: space.md },
  cell: { flexBasis: "47%", flexGrow: 1, marginHorizontal: 0, paddingVertical: 10, paddingHorizontal: space.md },
  cellLv: { fontFamily: font.pixel, fontSize: 18, color: color.gold, marginTop: 2 },
  gv: { fontFamily: font.pixel, color: color.gold },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, paddingHorizontal: space.lg },
  key: { flexDirection: "row", alignItems: "center", gap: 5 },
  sq: { width: 9, height: 9 },
});
