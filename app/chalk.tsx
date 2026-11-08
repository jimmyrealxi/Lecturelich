import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Frame, H, TopBar } from "@/components/game/Frame";
import { ITEMS, LOOT_CONFIG, RARITY_COLOR, RARITY_NAME, type Item, type Rarity } from "@/lib/papboy";
import { useCraft, useLoot } from "@/lib/queries/loot";
import { color, font, space } from "@/lib/theme";

// แลกเศษชอล์ก ตาม docs/mockups/b6c-chalk.html · เจ้าของให้ซ่อนชื่อเป็น ??? (เห็นแค่สี + ช่อง) แลกแล้วค่อยเปิดชื่อ
// ราคาอยู่ที่ LOOT_CONFIG.craft* (ตรงกับ loot_value() ใน migration 7b) · หักเศษ/ปลดล็อกใน RPC craft_item

const ORDER: Rarity[] = ["u", "r", "m", "n"];
const cost = (r: Rarity) => LOOT_CONFIG[`craft${r.toUpperCase() as "N" | "M" | "R" | "U"}`];

export default function Chalk() {
  const loot = useLoot();
  const craft = useCraft();
  const [sel, setSel] = useState<Item | null>(null);
  const [got, setGot] = useState<Item | null>(null);
  const d = loot.data;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/lootbox"));

  if (!d) {
    return (
      <View style={s.page}>
        <TopBar back="กล่อง" title="แลกเศษชอล์ก" onBack={back} />
        <Text style={[s.small, s.pad]}>{loot.isError ? "ระบบแลกยังไม่เปิด (รอตั้งค่าฐานข้อมูล)" : "กำลังโหลด…"}</Text>
      </View>
    );
  }

  const owned = new Set(d.owned);
  const list = ITEMS.filter((i) => !i.isDefault && !owned.has(i.id)).sort((a, b) => ORDER.indexOf(a.r) - ORDER.indexOf(b.r));
  const buy = () => {
    if (!sel || craft.isPending) return;
    const it = sel;
    craft.mutate(it.id, { onSuccess: () => { setGot(it); setSel(null); } });
  };

  return (
    <View style={s.page}>
      <TopBar back="กล่อง" title="แลกเศษชอล์ก" onBack={back} right={<Text style={s.small}>เศษชอล์ก <Text style={s.num}>{d.chalk}</Text></Text>} />
      <ScrollView contentContainerStyle={s.content}>
        <H>ราคา</H>
        <Frame>
          <View style={s.price}>
            {ORDER.slice().reverse().map((r) => (
              <View key={r} style={[s.p, { borderColor: RARITY_COLOR[r] }]}>
                <Text style={[s.pN, { color: RARITY_COLOR[r] }]}>{cost(r)}</Text>
                <Text style={[s.pL, { color: RARITY_COLOR[r] }]}>{RARITY_NAME[r]}</Text>
              </View>
            ))}
          </View>
        </Frame>

        <H>ของที่ยังไม่มี</H>
        <Frame>
          {list.length === 0 && <Text style={[s.small, s.pad, { paddingBottom: space.md }]}>เก็บครบทุกชิ้นแล้ว</Text>}
          {list.map((it, i) => {
            const c = cost(it.r);
            const can = d.chalk >= c;
            const picked = sel?.id === it.id;
            return (
              <Pressable key={it.id} onPress={() => setSel(picked ? null : it)} disabled={!can} accessibilityRole="button"
                accessibilityState={{ selected: picked, disabled: !can }}
                accessibilityLabel={`ของ ${RARITY_NAME[it.r]} ช่อง${it.slot} ราคา ${c} เศษชอล์ก${can ? "" : " เศษไม่พอ"}`}
                style={[s.row, i > 0 && s.sep, picked && s.rowOn]}>
                <View style={[s.sq, { backgroundColor: RARITY_COLOR[it.r] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.nm, { color: RARITY_COLOR[it.r] }]}>???</Text>
                  <Text style={s.small}>{it.slot}</Text>
                </View>
                <Text style={[s.cost, !can && { color: color.ash }]}>{c}</Text>
              </Pressable>
            );
          })}
        </Frame>
        {craft.isError && <Text style={[s.small, s.pad, { color: color.bossSoft }]}>แลกไม่สำเร็จ ลองใหม่อีกครั้ง</Text>}
      </ScrollView>

      <View style={s.acts} accessibilityLiveRegion="polite">
        {got ? (
          <>
            <View style={{ flex: 2, justifyContent: "center" }}>
              <Text style={[s.nm, { color: RARITY_COLOR[got.r] }]}>ได้ {got.name}</Text>
              <Text style={s.small}>{got.slot} · ไปใส่ที่ตู้แต่งตัว</Text>
            </View>
            <Pressable style={[s.btn, s.gold]} onPress={() => router.replace("/wardrobe")} accessibilityRole="button">
              <Text style={[s.btnT, { color: color.gold }]}>แต่งตัว</Text>
            </Pressable>
          </>
        ) : sel ? (
          <>
            <View style={{ flex: 2, justifyContent: "center" }}>
              <Text style={[s.nm, { color: RARITY_COLOR[sel.r] }]}>??? · {sel.slot}</Text>
              <Text style={s.small}>เหลือเศษ {d.chalk - cost(sel.r)} หลังแลก</Text>
            </View>
            <Pressable style={[s.btn, s.gold, craft.isPending && { opacity: 0.5 }]} disabled={craft.isPending} onPress={buy} accessibilityRole="button">
              <Text style={[s.btnT, { color: color.gold }]}>{craft.isPending ? "กำลังแลก…" : `แลก ${cost(sel.r)}`}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={[s.small, { flex: 1, textAlign: "center", paddingVertical: 14 }]}>แตะของที่อยากได้ · ได้เศษชอล์กจากของซ้ำในกล่อง</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.cave },
  content: { paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  pad: { paddingHorizontal: space.lg, paddingTop: space.md },
  small: { fontFamily: font.body, fontSize: 14, color: color.ash },
  num: { fontFamily: font.pixel, fontSize: 14, color: color.bone },
  sep: { borderTopWidth: 1, borderTopColor: color.seam },
  price: { flexDirection: "row", gap: 6, paddingVertical: space.md, paddingHorizontal: 14 },
  p: { flex: 1, alignItems: "center", paddingVertical: 6, borderWidth: 1 },
  pN: { fontFamily: font.pixel, fontSize: 16 },
  pL: { fontFamily: font.body, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: space.sm, paddingHorizontal: 14, minHeight: 56 },
  rowOn: { backgroundColor: color.gamePanel, outlineWidth: 1, outlineColor: color.gold, outlineStyle: "solid", outlineOffset: -1 },
  sq: { width: 10, height: 10 },
  nm: { fontFamily: font.bodyBold, fontSize: 15 },
  cost: { fontFamily: font.pixel, fontSize: 20, color: color.bone },
  acts: { flexDirection: "row", gap: space.sm, minHeight: 80, paddingTop: space.md, paddingHorizontal: space.lg, paddingBottom: space.lg, borderTopWidth: 1, borderTopColor: color.seam, backgroundColor: color.gameBar },
  btn: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: color.seam2, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  gold: { borderColor: color.gold, backgroundColor: color.gamePanel },
  btnT: { fontFamily: font.bodyBold, fontSize: 15, color: color.bone },
});
