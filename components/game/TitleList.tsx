import { Pressable, StyleSheet, Text, View } from "react-native";
import { Frame } from "@/components/game/Frame";
import { RARITY_COLOR } from "@/lib/papboy";
import { useSetTitle, type TitleState } from "@/lib/queries/loot";
import { TITLES } from "@/lib/titles";
import { color, font, space } from "@/lib/theme";

/** รายการฉายา (b7-titles) · ยังไม่ได้ = ซ่อนชื่อเป็น ??? แต่บอกเงื่อนไข */
export function TitleList({ state, onPicked }: { state: TitleState; onPicked: () => void }) {
  const set = useSetTitle();
  const current = state.current ?? TITLES[0].id;
  return (
    <Frame>
      {TITLES.map((t, i) => {
        const have = state.have[t.id] ?? 0;
        const got = have >= t.need;
        const on = t.id === current;
        return (
          <Pressable key={t.id} disabled={!got} style={[s.row, i > 0 && s.sep, on && s.on]} accessibilityRole="radio"
            aria-checked={on}
            onPress={() => { if (!on) set.mutate(t.id); onPicked(); }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, { color: got ? RARITY_COLOR[t.r] : color.ash }]}>{got ? t.name : "???"}</Text>
              <Text style={s.small}>{t.cond}</Text>
            </View>
            {!got && <Text style={s.n}>{have}/{t.need}</Text>}
          </Pressable>
        );
      })}
    </Frame>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 6, paddingHorizontal: space.md },
  sep: { borderTopWidth: 1, borderTopColor: color.seam },
  on: { borderWidth: 1, borderColor: color.gold },
  name: { fontFamily: font.bodyBold, fontSize: 15 },
  small: { fontFamily: font.body, fontSize: 14, color: color.ash },
  n: { fontFamily: font.pixel, fontSize: 15, color: color.ash },
});
