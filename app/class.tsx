import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { confirmAction } from "@/components/ui";
import { TopBar } from "@/components/game/Frame";
import { PapBoySprite } from "@/components/game/PapBoySprite";
import { ascById, classById, CLASSES } from "@/lib/classes";
import { thaiDate } from "@/lib/format";
import { DEFAULT_LOOK, type Look } from "@/lib/papboy";
import { useClassState, usePickAscendancy, usePickClass } from "@/lib/queries/classes";
import { useLoot } from "@/lib/queries/loot";
import { color, font, minTouch, space } from "@/lib/theme";

// เลือกคลาสตอนเปิดเทอม และสายย่อยเมื่อถึงกลางภาค (docs/mockups/b9-class-pick.html) · เลือกแล้วเปลี่ยนไม่ได้จนจบเทอม

const LOCK = "เลือกแล้วเปลี่ยนไม่ได้จนจบเทอม";
const preview = (cls: string, asc?: string): Look => ({ ...DEFAULT_LOOK, cls, asc: asc ?? null });

export default function ClassScreen() {
  const q = useClassState();
  const worn = useLoot().data?.look;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/game"));
  const d = q.data;
  const cls = classById(d?.class_id);

  return (
    <View style={s.page}>
      <TopBar back="เกม" title={cls ? "สายย่อย" : "เลือกคลาส"} onBack={back} />
      <ScrollView contentContainerStyle={s.content}>
        {!d ? (
          <Text style={s.small}>{q.isError ? "ยังเลือกคลาสไม่ได้ (รอตั้งค่าฐานข้อมูล)" : "กำลังโหลด…"}</Text>
        ) : !d.term_id ? (
          <Text style={s.small}>ยังไม่มีเทอมปัจจุบัน เพิ่มเทอมได้ในหน้าตั้งค่า</Text>
        ) : !cls ? (
          <PickClass worn={worn} />
        ) : d.asc_open && !d.ascendancy_id ? (
          <PickAsc cls={cls} worn={worn} />
        ) : (
          <View style={s.done}>
            <PapBoySprite look={worn ?? preview(cls.id, d.ascendancy_id ?? undefined)} size={192} label={cls.name} />
            <Text style={s.name}>{ascById(d.ascendancy_id)?.name ?? cls.name}</Text>
            <Text style={s.small}>{d.ascendancy_id ? `สายย่อยของ${cls.name}` : d.asc_on ? `เลือกสายย่อยได้ ${thaiDate(d.asc_on)}` : cls.vibe}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PickClass({ worn }: { worn?: Look }) {
  const [cur, setCur] = useState<(typeof CLASSES)[number]>(CLASSES[0]);
  const pick = usePickClass();
  const look = useMemo<Look>(() => ({ ...(worn ?? DEFAULT_LOOK), cls: cur.id, asc: null }), [worn, cur]);
  const tiles = useMemo(() => CLASSES.map((k) => ({ k, look: preview(k.id) })), []);
  return (
    <>
      <Text style={s.h}>เลือกคลาสเทอมนี้</Text>
      <Text style={s.small}>เปลี่ยนแค่หน้าตา ไม่มีผลกับคะแนน</Text>
      <View style={s.hero}><PapBoySprite look={look} size={192} label={`ตัวอย่าง ${cur.name}`} /></View>
      <Text style={s.name}>{cur.name}</Text>
      <Text style={s.vibe}>{cur.vibe}</Text>
      <View style={s.grid}>
        {tiles.map(({ k, look: l }) => (
          <Pressable key={k.id} style={[s.tile, k.id === cur.id && s.on]} onPress={() => setCur(k)}
            accessibilityRole="radio" accessibilityState={{ selected: k.id === cur.id }}>
            <PapBoySprite look={l} size={64} label="" />
            <Text style={[s.tileT, k.id === cur.id && { color: color.gold }]}>{k.name}</Text>
          </Pressable>
        ))}
      </View>
      <Go label={pick.isPending ? "กำลังบันทึก…" : `เป็น${cur.name}`} disabled={pick.isPending}
        onPress={() => confirmAction(`เป็น${cur.name} · ${LOCK}`, () => pick.mutate(cur.id))} />
      {pick.isError && <Text style={s.err}>เลือกไม่สำเร็จ ลองใหม่อีกครั้ง</Text>}
      <Text style={s.note}>{LOCK}</Text>
    </>
  );
}

function PickAsc({ cls, worn }: { cls: (typeof CLASSES)[number]; worn?: Look }) {
  const [cur, setCur] = useState<(typeof cls.asc)[number]>(cls.asc[0]);
  const pick = usePickAscendancy();
  const looks = useMemo(() => cls.asc.map((a) => ({ a, look: { ...(worn ?? DEFAULT_LOOK), cls: cls.id, asc: a.id } as Look })), [cls, worn]);
  return (
    <>
      <Text style={s.h}>เลือกสายย่อย</Text>
      <Text style={s.small}>{cls.name} แตกได้ {cls.asc.length} ทาง</Text>
      {looks.map(({ a, look }) => (
        <Pressable key={a.id} style={[s.asc, a.id === cur.id && s.on]} onPress={() => setCur(a)}
          accessibilityRole="radio" accessibilityState={{ selected: a.id === cur.id }}>
          <PapBoySprite look={look} size={96} label="" />
          <View style={{ flex: 1 }}>
            <Text style={s.ascN}>{a.name}</Text>
            <Text style={s.small}>{a.desc}</Text>
          </View>
        </Pressable>
      ))}
      <Go label={pick.isPending ? "กำลังบันทึก…" : `เป็น${cur.name}`} disabled={pick.isPending}
        onPress={() => confirmAction(`เป็น${cur.name} · ${LOCK}`, () => pick.mutate(cur.id))} />
      {pick.isError && <Text style={s.err}>เลือกไม่สำเร็จ ลองใหม่อีกครั้ง</Text>}
      <Text style={s.note}>{LOCK}</Text>
    </>
  );
}

function Go({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.go, disabled && { opacity: 0.5 }]} disabled={disabled} onPress={onPress} accessibilityRole="button">
      <Text style={s.goT}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.cave },
  content: { padding: space.lg, paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  h: { fontFamily: font.title, fontSize: 25, lineHeight: 36, color: color.gold },
  small: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.ash },
  hero: { alignItems: "center", marginTop: space.md, backgroundColor: color.gameDeep, borderWidth: 1, borderColor: color.seam, padding: space.xs },
  name: { fontFamily: font.title, fontSize: 23, lineHeight: 34, color: color.bone, marginTop: space.md },
  vibe: { fontFamily: font.body, fontSize: 16, lineHeight: 24, color: color.ash, marginBottom: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tile: { flexBasis: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 76, paddingRight: space.sm, backgroundColor: color.gamePanel, borderWidth: 1, borderColor: color.seam },
  on: { borderColor: color.gold },
  tileT: { flex: 1, fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 21, color: color.bone },
  asc: { flexDirection: "row", gap: 10, padding: 10, marginTop: 10, backgroundColor: color.gamePanel, borderWidth: 1, borderColor: color.seam },
  ascN: { fontFamily: font.title, fontSize: 19, lineHeight: 28, color: color.bone },
  go: { minHeight: Math.max(minTouch, 52), marginTop: 14, backgroundColor: color.gold, alignItems: "center", justifyContent: "center" },
  goT: { fontFamily: font.bodyBold, fontSize: 17, color: color.cave },
  err: { fontFamily: font.body, fontSize: 15, color: color.bossSoft, textAlign: "center", marginTop: space.sm },
  note: { fontFamily: font.body, fontSize: 15, color: color.ash, textAlign: "center", marginTop: space.sm },
  done: { alignItems: "center", paddingTop: space.lg },
});
