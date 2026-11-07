import { useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Frame, H, TopBar } from "@/components/game/Frame";
import { BoxIcon, drawBox } from "@/components/game/LootArt";
import { useLoop } from "@/components/game/loop";
import { buildSheet, FRAMES, itemById, LOOT_CONFIG, RARITY_COLOR, RARITY_NAME, type Look, type Rarity } from "@/lib/papboy";
import { useEquip, useLoot, useOpenBox, type BoxKind, type Opened } from "@/lib/queries/loot";
import { shortDate } from "@/lib/format";
import { bangkokNow } from "@/lib/schedule";
import { color, font, space } from "@/lib/theme";

// เปิดกล่อง ตาม docs/mockups/b6-lootbox.html · จอ 1 กล่องรอเปิด + โอกาส + กันดวงซวย + ได้ล่าสุด · จอ 2 สั่น → แตก → ลำแสง → ป้ายชื่อ + Pap-Boy ลองใส่
// ผลสุ่มมาจาก DB (RPC open_box) · จอ 3 แลกเศษชอล์ก ยังไม่ทำ (รอเจ้าของตัดสิน)

const BOX: Record<BoxKind, { name: string; from: string }> = {
  iron: { name: "กล่องเหล็ก", from: `ครบทุก ${LOOT_CONFIG.ironEvery} XP` },
  silver: { name: "กล่องเงิน", from: "เป้าย่อย" },
  gold: { name: "กล่องทอง", from: "ล้มบอสประจำเทอม" },
};
const ODDS: [Rarity, number][] = [["n", LOOT_CONFIG.oddsN], ["m", LOOT_CONFIG.oddsM], ["r", LOOT_CONFIG.oddsR], ["u", LOOT_CONFIG.oddsU]];

export default function LootBox() {
  const loot = useLoot();
  const open = useOpenBox();
  const [res, setRes] = useState<{ kind: BoxKind; got: Opened; base: Look; chalkBefore: number } | null>(null);
  const d = loot.data;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/game"));

  if (!d) {
    return (
      <View style={s.page}>
        <TopBar back="เกม" title="กล่อง" onBack={back} />
        <Text style={[s.small, s.pad]}>{loot.isError ? "ระบบกล่องยังไม่เปิด (รอตั้งค่าฐานข้อมูล)" : "กำลังโหลด…"}</Text>
      </View>
    );
  }
  if (res) return <Opening {...res} onDone={() => setRes(null)} />;

  const count = (k: BoxKind) => d.boxes.filter((b) => b.kind === k).length;
  const kinds = (["iron", "silver", "gold"] as const).filter((k) => k === "iron" || count(k) > 0);
  const next = d.boxes.find((b) => b.kind === "iron") ?? d.boxes[0];
  const today = bangkokNow().date;

  const start = () => {
    if (!next || open.isPending) return;
    open.mutate(next.id, { onSuccess: (got) => setRes({ kind: next.kind, got, base: d.look, chalkBefore: d.chalk }) });
  };

  return (
    <View style={s.page}>
      <TopBar back="เกม" title="กล่อง" onBack={back} right={<Text style={s.small}>เศษชอล์ก <Text style={s.num}>{d.chalk}</Text></Text>} />
      <ScrollView contentContainerStyle={s.content}>
        <H>รอเปิด</H>
        <Frame>
          {kinds.map((k, i) => (
            <View key={k} style={[s.box, i > 0 && s.sep]}>
              <BoxIcon kind={k} dim={count(k) === 0} />
              <View style={{ flex: 1 }}>
                <Text style={[s.boxName, count(k) === 0 && { color: color.ash }]}>{BOX[k].name}</Text>
                <Text style={s.small}>{BOX[k].from}</Text>
              </View>
              <Text style={[s.cnt, count(k) === 0 && { color: color.ash }]}>×{count(k)}</Text>
            </View>
          ))}
        </Frame>

        <H>โอกาสในกล่องเหล็ก</H>
        <Frame>
          <View style={s.odds}>
            {ODDS.map(([r, p]) => (
              <View key={r} style={[s.odd, { borderColor: RARITY_COLOR[r] }]}>
                <Text style={[s.oddN, { color: RARITY_COLOR[r] }]}>{p}%</Text>
                <Text style={[s.oddL, { color: RARITY_COLOR[r] }]}>{RARITY_NAME[r]}</Text>
              </View>
            ))}
          </View>
          <View style={s.pity}>
            <Text style={s.small}>
              ยังไม่เจอ rare มา <Text style={s.num}>{d.pity}</Text> กล่อง · ครบ {LOOT_CONFIG.pity} กล่องใบถัดไปได้ rare แน่นอน
            </Text>
            <View style={s.bar}><View style={[s.barFill, { transform: [{ scaleX: Math.min(1, d.pity / LOOT_CONFIG.pity) }] }]} /></View>
          </View>
        </Frame>

        {d.recent.length > 0 && (
          <>
            <H>ได้ล่าสุด</H>
            <Frame>
              {d.recent.map((r, i) => {
                const it = itemById(r.item_id);
                if (!it) return null;
                const at = bangkokNow(new Date(r.at)).date;
                return (
                  <View key={i} style={[s.recent, i > 0 && s.sep]}>
                    <View style={[s.sq, { backgroundColor: RARITY_COLOR[it.r] }]} />
                    <Text style={[s.body, { flex: 1, color: it.r === "n" ? color.bone : RARITY_COLOR[it.r] }]}>
                      {it.name}{r.chalk ? <Text style={s.small}>  (ซ้ำ → เศษชอล์ก +{r.chalk})</Text> : null}
                    </Text>
                    <Text style={s.small}>{at === today ? "วันนี้" : shortDate(at)}</Text>
                  </View>
                );
              })}
            </Frame>
          </>
        )}
        {open.isError && <Text style={[s.small, s.pad, { color: color.bossSoft, marginTop: space.md }]}>เปิดกล่องไม่สำเร็จ ลองใหม่อีกครั้ง</Text>}
      </ScrollView>
      <View style={s.acts}>
        <Pressable onPress={start} disabled={!next || open.isPending} accessibilityRole="button"
          style={[s.btn, s.gold, (!next || open.isPending) && { opacity: 0.5 }]}>
          <Text style={[s.btnT, { color: color.gold }]}>
            {open.isPending ? "กำลังเปิด…" : next ? `เปิด${BOX[next.kind].name}` : "ยังไม่มีกล่อง · ได้จาก XP"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const SHAKE = 36, BURST = SHAKE + 6;
type Part = { x: number; y: number; vx: number; vy: number; life: number; c: string };

function Opening({ kind, got, base, chalkBefore, onDone }: { kind: BoxKind; got: Opened; base: Look; chalkBefore: number; onDone: () => void }) {
  const it = itemById(got.item_id);
  const dup = got.chalk > 0;
  // ลดการเคลื่อนไหว = ข้ามไปผลเลย
  const [reduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [shown, setShown] = useState(reduced);
  const equip = useEquip();
  const t = useRef(reduced ? BURST : 0);
  const parts = useRef<Part[]>([]);
  const ref = useRef<HTMLCanvasElement>(null);
  const wearing = useMemo(() => (it && !dup ? { ...base, [it.k]: it.v } : base), [it, dup, base]);
  const pb = useMemo(() => (Platform.OS === "web" ? buildSheet(wearing) : null), [wearing]);
  const col = RARITY_COLOR[got.rarity];
  const power = { n: 1, m: 2, r: 3, u: 4 }[got.rarity];

  useLoop(ref, (f) => {
    const S = ref.current?.getContext("2d");
    if (!S || !pb) return;
    const T = t.current;
    const R = (x: number, y: number, w: number, h: number, c: string, a = 1) => { S.globalAlpha = a; S.fillStyle = c; S.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    S.imageSmoothingEnabled = false;
    R(0, 0, 120, 160, "#140F0D");
    for (let y = 0; y < 126; y += 6) { for (let x = ((y / 6) % 2) * 6; x < 120; x += 12) R(x, y, 1, 6, "#1C1612"); R(0, y + 5, 120, 1, "#1C1612"); }
    R(0, 126, 120, 34, "#1E1714"); for (let x = 0; x < 120; x += 11) R(x, 126, 1, 34, "#2C221B"); R(0, 126, 120, 1, "#3B3027");
    if (T < BURST) {
      // กล่องสั่นแรงขึ้นตามความหายาก → ฝาเด้ง → แตกเป็นประกาย
      const amp = T < SHAKE ? Math.min(power, 1 + T / (SHAKE / power)) * (T % 2 ? 1 : -1) : 0;
      for (let x = -16; x <= 16; x++) R(60 + x, 127, 1, 1, "#000", 0.4 * (1 - Math.abs(x) / 17));
      if (T > SHAKE * 0.5) { const g = (T - SHAKE * 0.5) / (SHAKE * 0.5); for (let k = 0; k < 3; k++) R(36 - k * 4, 72 - k * 4, 48 + k * 8, 56 + k * 8, col, 0.05 * g * power); }
      S.globalAlpha = 1;
      drawBox(S, kind, 36 + amp, 79, 2, T > SHAKE ? Math.min(6, (T - SHAKE) * 2) : 0);
      if (T > SHAKE * 0.6 && T % 3 === 0) R(56 + Math.random() * 8, 76, 1, 3, "#FFF6C8", 0.8);
      if (T === SHAKE) for (let i = 0; i < 40 + power * 15; i++) { const a = Math.random() * 6.28, v = 0.5 + Math.random() * 2.2; parts.current.push({ x: 60, y: 96, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: (18 + Math.random() * 20) | 0, c: Math.random() < 0.6 ? col : "#FFF6C8" }); }
    } else {
      // ลำแสงพื้นถึงเพดาน + Pap-Boy ลองใส่ของ
      const pulse = 0.75 + 0.25 * Math.sin(f * 0.3), w = 6 + power * 3;
      for (let y = 0; y < 127; y++) { const a = (0.08 + 0.5 * (y / 127)) * pulse; R(60 - w / 2, y, w, 1, col, a * 0.6); R(60 - w / 4, y, w / 2, 1, "#FFFFFF", a * 0.35); }
      for (let x = -26; x <= 26; x++) R(60 + x, 126, 1, 2, col, 0.6 * (1 - Math.abs(x) / 27));
      S.globalAlpha = 1; S.drawImage(pb, (f % FRAMES) * 64, 0, 64, 64, 28, 68, 64, 64);
      if (f % 4 === 0 && parts.current.length < 150) parts.current.push({ x: 60 + (Math.random() - 0.5) * w, y: 126, vx: (Math.random() - 0.5) * 0.3, vy: -0.6 - Math.random() * 0.8, life: 40, c: col });
    }
    for (const p of parts.current) { p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life--; R(p.x, p.y, 1, 1, p.c, Math.min(1, p.life / 12)); }
    parts.current = parts.current.filter((p) => p.life > 0).slice(-150);
    S.globalAlpha = 1;
    if (T === BURST - 1) setShown(true);
    if (f > 0 && T < BURST) t.current++;
  }, 70);

  const skip = () => { if (t.current < BURST) { t.current = BURST; parts.current = []; setShown(true); } };
  const finish = () => (it && !dup ? equip.mutate({ slot: it.k, value: it.v }, { onSettled: onDone }) : onDone());

  return (
    <View style={s.page}>
      <TopBar back="กล่อง" title={BOX[kind].name} onBack={onDone}
        right={<Text style={s.small}>เศษชอล์ก <Text style={s.num}>{shown ? chalkBefore + got.chalk : chalkBefore}</Text></Text>} />
      <Pressable style={s.arena} onPress={skip} accessibilityLabel="แตะเพื่อข้ามไปผล">
        {Platform.OS === "web" && (
          <canvas ref={ref} width={120} height={160} role="img" aria-label="กล่องกำลังเปิด"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 100%", imageRendering: "pixelated" }} />
        )}
        {shown && it && (
          <View style={[s.label, { borderColor: col, boxShadow: `inset 0 0 0 2px ${color.gameDeep}, 0 0 24px -6px ${col}` }]} accessibilityLiveRegion="polite">
            <Text style={[s.n1, { color: col }]}>{it.name}</Text>
            <Text style={s.small}>{it.slot}</Text>
            <Text style={[s.tag, { backgroundColor: col }]}>{RARITY_NAME[got.rarity]}</Text>
            {dup && <Text style={[s.body, { marginTop: 6 }]}>มีอยู่แล้ว → เศษชอล์ก <Text style={s.num}>+{got.chalk}</Text></Text>}
          </View>
        )}
        <Text style={s.hint}>{!shown ? "กำลังลุ้น… แตะเพื่อข้าม" : dup ? "ได้ซ้ำ แปลงเป็นเศษชอล์กให้แล้ว" : "Pap-Boy ลองใส่ให้ดูแล้ว"}</Text>
      </Pressable>
      <View style={s.acts}>
        {!dup && (
          <Pressable style={[s.btn, !shown && { opacity: 0.5 }]} disabled={!shown} onPress={onDone} accessibilityRole="button">
            <Text style={s.btnT}>เก็บไว้</Text>
          </Pressable>
        )}
        <Pressable style={[s.btn, s.gold, (!shown || equip.isPending) && { opacity: 0.5 }]} disabled={!shown || equip.isPending} onPress={finish} accessibilityRole="button">
          <Text style={[s.btnT, { color: color.gold }]}>{dup ? "ตกลง" : "ใส่เลย"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.cave },
  content: { paddingBottom: space.xl, width: "100%", maxWidth: 560, alignSelf: "center" },
  pad: { paddingHorizontal: space.lg, paddingTop: space.md },
  small: { fontFamily: font.body, fontSize: 13, color: color.ash },
  body: { fontFamily: font.body, fontSize: 14, color: color.bone },
  num: { fontFamily: font.pixel, fontSize: 14, color: color.bone },
  sep: { borderTopWidth: 1, borderTopColor: color.seam },
  box: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 10, paddingHorizontal: 14, minHeight: 72 },
  boxName: { fontFamily: font.bodyBold, fontSize: 15, color: color.bone },
  cnt: { fontFamily: font.pixel, fontSize: 20, color: color.gold },
  odds: { flexDirection: "row", gap: 6, paddingVertical: space.md, paddingHorizontal: 14 },
  odd: { flex: 1, alignItems: "center", paddingVertical: 6, borderWidth: 1 },
  oddN: { fontFamily: font.pixel, fontSize: 16 },
  oddL: { fontFamily: font.body, fontSize: 12 },
  pity: { paddingHorizontal: 14, paddingBottom: 14 },
  bar: { height: 8, backgroundColor: color.gameDeep, borderWidth: 1, borderColor: color.seam, marginTop: 6, overflow: "hidden" },
  barFill: { height: "100%", width: "100%", backgroundColor: RARITY_COLOR.r, transformOrigin: "left" },
  recent: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: space.sm, paddingHorizontal: 14, minHeight: 48 },
  sq: { width: 10, height: 10 },
  acts: { flexDirection: "row", gap: space.sm, paddingTop: space.md, paddingHorizontal: space.lg, paddingBottom: space.lg, borderTopWidth: 1, borderTopColor: color.seam, backgroundColor: color.gameBar },
  btn: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: color.seam2, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  gold: { borderColor: color.gold, backgroundColor: color.gamePanel },
  btnT: { fontFamily: font.bodyBold, fontSize: 15, color: color.bone },
  arena: { flex: 1, minHeight: 380, overflow: "hidden", position: "relative" },
  label: {
    position: "absolute", top: 22, alignSelf: "center", minWidth: 220, maxWidth: "90%", alignItems: "center",
    paddingTop: 10, paddingBottom: 12, paddingHorizontal: space.lg, backgroundColor: "rgba(6,5,4,0.92)", borderWidth: 1,
  },
  n1: { fontFamily: font.bodyBold, fontSize: 18, lineHeight: 26 },
  tag: { marginTop: 6, fontFamily: font.bodyBold, fontSize: 12, color: color.gameDeep, paddingHorizontal: 10, paddingVertical: 2 },
  hint: { position: "absolute", left: 0, right: 0, bottom: space.lg, textAlign: "center", fontFamily: font.body, fontSize: 14, color: color.ash },
});
