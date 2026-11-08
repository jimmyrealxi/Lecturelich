import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { TopBar } from "@/components/game/Frame";
import { Thumb } from "@/components/game/LootArt";
import { PapBoySprite } from "@/components/game/PapBoySprite";
import { ITEMS, RARITY_COLOR, SLOTS, type Item, type Slot } from "@/lib/papboy";
import { useEquip, useLoot } from "@/lib/queries/loot";
import { color, font, minTouch, space } from "@/lib/theme";

// ตู้แต่งตัว Pap-Boy (docs/mockups/papboy-v1.html ในโลกมืดของหน้าเกม) · แตะของ = ลองใส่ · ของที่ยังไม่ได้ = เงา ??? ลองดูได้ ใส่ไม่ได้

const GROUPS: [string, Slot[]][] = [
  ["หน้า", ["glow", "mouth", "eyes"]], ["หัว", ["ears", "hat"]], ["ตัว", ["outfit", "scarf", "shoes"]],
  ["ปีก/ของถือ", ["wings", "held", "pet"]], ["ออร่า", ["back", "ground", "fx", "bg"]],
];
const SHOWN = ITEMS.filter((i) => i.v !== "none"); // "ไม่ใส่" ไม่ต้องมีช่อง (ถอดได้จากปุ่มถอด)

export default function Wardrobe() {
  const loot = useLoot();
  const equip = useEquip();
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState<Item | null>(null);
  const d = loot.data;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/game"));

  if (!d) {
    return (
      <View style={s.page}>
        <TopBar back="เกม" title="แต่งตัว" onBack={back} />
        <Text style={[s.small, s.pad]}>{loot.isError ? "ตู้แต่งตัวยังไม่เปิด (รอตั้งค่าฐานข้อมูล)" : "กำลังโหลด…"}</Text>
      </View>
    );
  }

  const owned = new Set(d.owned);
  const own = (it: Item) => it.isDefault || owned.has(it.id);
  const look = sel && own(sel) ? { ...d.look, [sel.k]: sel.v } : d.look; // ของที่ยังไม่ได้ = ไม่ให้ลองใส่จริง เห็นแค่เงา
  const worn = SLOTS.filter((x) => d.look[x.k] !== x.o[0][0]).length;
  const on = sel ? d.look[sel.k] === sel.v : false;
  const def = sel ? SLOTS.find((x) => x.k === sel.k)!.o[0][0] : "";
  const canOff = on && sel?.v !== def;
  const list = SHOWN.filter((it) => GROUPS[tab][1].includes(it.k));

  const act = () => {
    if (!sel) return;
    equip.mutate({ slot: sel.k, value: on ? def : sel.v });
    setSel(null);
  };

  return (
    <View style={s.page}>
      <TopBar back="เกม" title="แต่งตัว" onBack={back} right={<Text style={s.small}>ใส่ <Text style={s.count}>{worn}/{SLOTS.length}</Text></Text>} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.stage}>
          <View style={{ alignSelf: "center" }}><PapBoySprite look={look} size={192} bg label="Pap-Boy ในชุดที่เลือก" /></View>
          {sel && (
            <View style={s.try}>
              <View style={{ flex: 1 }}>
                <Text style={[s.tryName, { color: RARITY_COLOR[sel.r] }]}>{own(sel) ? sel.name : "???"}</Text>
                <Text style={s.small}>{!own(sel) ? "ยังไม่ได้ · ได้จากกล่อง" : on ? "ใส่อยู่" : "กำลังลองใส่"}</Text>
              </View>
              <Pressable style={s.no} onPress={() => setSel(null)} accessibilityRole="button"><Text style={s.btnT}>ยกเลิก</Text></Pressable>
              <Pressable style={[s.ok, (!own(sel) || (on && !canOff)) && { opacity: 0.4 }]} disabled={!own(sel) || (on && !canOff)}
                onPress={act} accessibilityRole="button">
                <Text style={[s.btnT, { color: color.gold }]}>{on ? "ถอด" : "ใส่"}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs} accessibilityRole="tablist">
          {GROUPS.map(([g], i) => (
            <Pressable key={g} onPress={() => setTab(i)} accessibilityRole="tab" accessibilityState={{ selected: i === tab }}
              style={[s.tab, i === tab && s.tabOn]}>
              <Text style={[s.tabT, i === tab && { color: color.gold }]}>{g}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.inv}>
          {list.map((it) => {
            const ok = own(it);
            const picked = sel?.id === it.id;
            return (
              <Pressable key={it.id} onPress={() => setSel(picked ? null : it)} accessibilityRole="button"
                accessibilityState={{ selected: picked }} accessibilityLabel={`${ok ? it.name : "ยังไม่ได้"} · ${it.slot}`}
                style={[s.tile, { borderColor: it.r === "n" ? color.seam2 : RARITY_COLOR[it.r] }, picked && s.tilePicked]}>
                {d.look[it.k] === it.v && <Text style={s.onTag}>ใส่อยู่</Text>}
                <Thumb item={it} size={76} locked={!ok} />
                {!ok && <Text style={s.lockQ}>?</Text>}
                <Text style={[s.tileName, ok && it.r !== "n" && { color: RARITY_COLOR[it.r] }]} numberOfLines={1}>{ok ? it.name : "???"}</Text>
                <Text style={s.tileSlot}>{it.slot}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[s.small, s.pad]}>เก็บได้ {SHOWN.filter(own).length}/{SHOWN.length} ชิ้น · แตะของ = ลองใส่</Text>
        {equip.isError && <Text style={[s.small, s.pad, { color: color.bossSoft }]}>ใส่ไม่สำเร็จ ลองใหม่อีกครั้ง</Text>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.cave },
  content: { paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  pad: { paddingHorizontal: space.lg, paddingTop: space.md },
  small: { fontFamily: font.body, fontSize: 14, color: color.ash },
  count: { fontFamily: font.pixel, fontSize: 13, color: color.bone },
  stage: { paddingVertical: space.md, paddingHorizontal: space.md, backgroundColor: color.gameBar, borderBottomWidth: 3, borderBottomColor: color.gold },
  try: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 10 },
  tryName: { fontFamily: font.bodyBold, fontSize: 15 },
  no: { minHeight: minTouch, paddingHorizontal: space.lg, borderWidth: 1, borderColor: color.seam2, justifyContent: "center" },
  ok: { minHeight: minTouch, paddingHorizontal: space.lg, borderWidth: 1, borderColor: color.gold, backgroundColor: color.gamePanel, justifyContent: "center" },
  btnT: { fontFamily: font.bodyBold, fontSize: 15, color: color.bone },
  tabs: { borderBottomWidth: 1, borderBottomColor: color.seam, paddingHorizontal: space.sm },
  tab: { minHeight: minTouch, paddingHorizontal: 14, justifyContent: "center", borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabOn: { borderBottomColor: color.gold },
  tabT: { fontFamily: font.bodyBold, fontSize: 15, color: color.ash },
  inv: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: space.lg, paddingTop: 14 },
  tile: { width: 84, borderWidth: 2, backgroundColor: color.gamePanel, alignItems: "center", paddingBottom: 4, position: "relative" },
  tilePicked: { outlineWidth: 2, outlineColor: color.bone, outlineStyle: "solid", outlineOffset: 2 },
  onTag: { position: "absolute", top: 3, left: 3, zIndex: 1, fontFamily: font.bodyBold, fontSize: 12, color: color.gameDeep, backgroundColor: color.gold, paddingHorizontal: 4 },
  lockQ: { position: "absolute", top: 18, left: 0, right: 0, textAlign: "center", fontFamily: font.bodyBold, fontSize: 26, color: color.bone },
  tileName: { fontFamily: font.body, fontSize: 13, color: color.bone, marginTop: 4, paddingHorizontal: 2 },
  tileSlot: { fontFamily: font.body, fontSize: 12, color: color.ash },
});
