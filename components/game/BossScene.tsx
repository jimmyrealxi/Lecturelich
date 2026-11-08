import { useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useLoop } from "@/components/game/loop";
import type { BossStage } from "@/lib/boss";
import { buildSheet, FRAMES, glowOf, PALM, type Look } from "@/lib/papboy";
import { color, font } from "@/lib/theme";

// ฉากสู้บอสประจำเทอม (b5-game.html) · canvas 128×72 ขยายแบบ pixelated · Pap-Boy ยิงสกิลจากฝ่ามือใส่บอสเอง (ดูเฉย ๆ ไม่ต้องกด)
// ห้อง/ตัวบอส/Pap-Boy วาดครั้งเดียวเป็นภาพซ่อน → ต่อเฟรมแค่ drawImage + กระสุน ประกาย (เพดาน 150) เลขดาเมจ
// บอส "อสูรกองข้อสอบ" ออกแบบเอง ไม่อิงเกมใด

const W = 128, H = 72;
const BOSS = { x: 98, y: 39 };
const PB = { x: -6, y: 8 }; // มุมซ้ายบนของ Pap-Boy (กรอบ 64) ในฉาก
const HAND = { x: PB.x + PALM.x, y: PB.y + PALM.y };
const MAX_SPARKS = 150;
const SKILL: Record<BossStage, string> = { start: "สกิล: ลูกไฟจิ๋ว", mid: "สกิล: ดินสอนำวิถี ×3", end: "สกิล: ลำแสงปลายภาค + วงเวท", dead: "เทอมนี้จบแล้ว" };

type Shot = { t: number; v: number; missile: boolean; c: string; s: number; arc: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; c: string };
type Num = { x: number; y: number; life: number; v: number };

function canvas(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  return [cv, cv.getContext("2d")!] as const;
}
const rect = (S: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string, a = 1) => {
  S.globalAlpha = a; S.fillStyle = col; S.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const circ = (S: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, a = 1) => {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) rect(S, cx + x, cy + y, 1, 1, col, a);
};

/** ห้องหินมืด (นิ่ง) */
function drawRoom() {
  const [cv, S] = canvas(W, H);
  rect(S, 0, 0, W, H, "#140F0D");
  for (let y = 0; y < 60; y += 6) { for (let x = ((y / 6) % 2) * 6; x < W; x += 12) rect(S, x, y, 1, 6, "#1C1612"); rect(S, 0, y + 5, W, 1, "#1C1612"); }
  rect(S, 0, 60, W, 12, "#1E1714"); for (let x = 0; x < W; x += 11) rect(S, x, 60, 1, 12, "#2C221B"); rect(S, 0, 60, W, 1, "#3B3027");
  rect(S, 62, 32, 2, 6, "#54443A"); circ(S, 63, 30, 6, "#EE8A3C", 0.06);
  return cv;
}

/** ตัวบอส 48 เฟรม (กรอบ 48×48 กลาง = BOSS) · ไม่รวมเศษกระดาษโคจร/แสงโดนตี */
function drawBossSheet() {
  const [cv, S] = canvas(48 * FRAMES, 48);
  for (let f = 0; f < FRAMES; f++) {
    const cx = f * 48 + 24, cy = 24 + (f % 16 < 8 ? 0 : 1), w = f % 8 < 4 ? 0 : 1;
    for (let x = -12; x <= 12; x++) rect(S, cx + x, 47, 1, 1, "#000", 0.35 * (1 - Math.abs(x) / 13));
    rect(S, cx - 19, cy + 2 + w, 6, 3, "#2A211B"); rect(S, cx - 18, cy + 3 + w, 5, 1, "#D9CFBE");
    rect(S, cx + 13, cy + 2 - w, 6, 3, "#2A211B"); rect(S, cx + 14, cy + 3 - w, 5, 1, "#D9CFBE");
    rect(S, cx - 13, cy - 15, 26, 32, "#2A211B"); rect(S, cx - 12, cy - 14, 24, 30, "#BFB29C");
    rect(S, cx - 11, cy - 16, 24, 30, "#2A211B"); rect(S, cx - 10, cy - 15, 22, 28, "#D9CFBE");
    for (let y = cy - 11; y < cy + 12; y += 3) rect(S, cx - 8, y, 18, 1, "#9C8E7A", 0.8);
    rect(S, cx + 3, cy - 13, 6, 1, "#C2372C"); rect(S, cx + 6, cy - 12, 1, 3, "#C2372C"); rect(S, cx - 8, cy + 8, 7, 1, "#C2372C"); rect(S, cx - 7, cy + 10, 10, 1, "#C2372C", 0.8);
    circ(S, cx + 1, cy - 1, 6, "#2A211B"); circ(S, cx + 1, cy - 1, 5, "#120F0D");
    if (f % 48 > 44) rect(S, cx - 3, cy - 1, 9, 1, "#E5392C");
    else { circ(S, cx - 1, cy, 2, "#E5392C"); rect(S, cx - 2, cy - 1, 1, 1, "#FFB4AB"); }
    circ(S, cx + 1, cy - 1, 9, "#C2372C", 0.05);
  }
  return cv;
}

/** บอสล้ม: เศษกระดาษบนพื้น + กล่องทองมีลำแสง (นิ่ง) */
function drawDead() {
  const [cv, S] = canvas(W, H);
  for (let i = 0; i < 14; i++) rect(S, 78 + ((i * 37) % 40), 62 + (i % 3), 4, 2, i % 4 ? "#D9CFBE" : "#C2372C", 0.8);
  for (let y = 0; y < 60; y++) rect(S, 95, y, 6, 1, "#F2C230", 0.05 + 0.25 * (y / 60));
  rect(S, 92, 52, 12, 9, "#2A2118"); rect(S, 92, 52, 12, 1, "#C9A25B"); rect(S, 92, 55, 12, 1, "#C9A25B"); rect(S, 97, 55, 2, 3, "#FFE680");
  return cv;
}

export function BossScene(p: { look: Look; stage: BossStage; title: string; pct: number; phase: number | null; note: string }) {
  return (
    <View style={s.scene}>
      {Platform.OS === "web" && <SceneCanvas look={p.look} stage={p.stage} />}
      <View style={s.bossbar} pointerEvents="none">
        <View style={s.bn}>
          <Text style={s.bname} numberOfLines={1}>{p.title}</Text>
          <Text style={s.bpct}>{Math.round(p.pct * 100)}%</Text>
        </View>
        <View style={s.hp} accessible accessibilityRole="progressbar" accessibilityLabel="เลือดบอสประจำเทอม"
          accessibilityValue={{ now: Math.round(p.pct * 100), min: 0, max: 100 }}>
          <View style={[s.hpFill, { transform: [{ scaleX: p.pct }] }]} />
          {p.phase != null && <View style={[s.ph, { left: `${p.phase * 100}%` }]} />}
        </View>
        <Text style={s.st2}>{p.note}</Text>
      </View>
      <Text style={s.skill}>{SKILL[p.stage]}</Text>
    </View>
  );
}

function SceneCanvas({ look, stage }: { look: Look; stage: BossStage }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const art = useMemo(() => ({ room: drawRoom(), boss: drawBossSheet(), dead: drawDead() }), []);
  const pb = useMemo(() => buildSheet(look), [look]);
  const g = useRef({ shots: [] as Shot[], sparks: [] as Spark[], nums: [] as Num[], hit: 0, beam: 0 });

  useLoop(ref, (f) => {
    const S = ref.current?.getContext("2d");
    if (!S) return;
    const st = g.current;
    const dead = stage === "dead";
    const glow = glowOf(look);

    const impact = (col: string, n: number, dmg: number) => {
      st.hit = 4;
      for (let i = 0; i < n && st.sparks.length < MAX_SPARKS; i++) {
        const a = Math.random() * 6.28, v = 0.4 + Math.random() * 0.9;
        st.sparks.push({ x: BOSS.x - 6, y: BOSS.y + Math.random() * 10 - 5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, life: (10 + Math.random() * 8) | 0, c: col });
      }
      if (Math.random() < 0.5 && st.nums.length < 8) st.nums.push({ x: BOSS.x + 4 + Math.random() * 12, y: BOSS.y - 14, life: 22, v: dmg });
    };
    // ---- ลอจิก (ครั้งละ tick) ----
    if (!dead && f > 0) {
      if (stage === "start" && f % 14 === 0) st.shots.push({ t: 0, v: 0.07, missile: false, c: glow, s: 2, arc: 0 });
      if (stage === "mid" && f % 16 === 0) for (let i = 0; i < 3; i++) st.shots.push({ t: -i * 0.12, v: 0.055, missile: true, c: i % 2 ? "#8AB0FF" : glow, s: 3, arc: (i - 1) * 8 + 10 });
      if (stage === "end") { if (f % 9 === 0) st.shots.push({ t: 0, v: 0.08, missile: false, c: "#FFE680", s: 3, arc: f % 18 ? 14 : 6 }); if (f % 44 === 0) st.beam = 16; }
      for (const sh of st.shots) sh.t += sh.v;
      st.shots = st.shots.filter((sh) => (sh.t >= 1 ? (impact(sh.c, sh.missile ? 5 : 3, sh.missile ? 2 : 1), false) : true));
      if (st.beam > 0) { st.beam--; if (st.beam % 3 === 0) impact("#EE8A3C", 6, 4); }
      for (const p of st.sparks) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; }
      st.sparks = st.sparks.filter((p) => p.life > 0);
      for (const n of st.nums) { n.y -= 0.4; n.life--; }
      st.nums = st.nums.filter((n) => n.life > 0);
      if (st.hit > 0) st.hit--;
    }
    // ---- วาด ----
    S.imageSmoothingEnabled = false;
    S.save();
    if (st.beam > 0 && f % 2) S.translate(1, 0);
    S.globalAlpha = 1;
    S.drawImage(art.room, 0, 0);
    const fl = f % 6 < 3; // คบไฟ
    rect(S, 61, 29, 4, 3, "#EE8A3C", 0.9); rect(S, 62, 28 - (fl ? 1 : 0), 2, 2, "#FFE680");
    if (dead) {
      S.globalAlpha = 1; S.drawImage(art.dead, 0, 0);
      if (f % 10 < 6) { rect(S, 90, 48, 1, 1, "#FFE680"); rect(S, 106, 46, 1, 1, "#FFE680"); rect(S, 98, 44, 1, 1, "#FFF6C8"); }
    } else {
      const bf = f % FRAMES, by = BOSS.y + (bf % 16 < 8 ? 0 : 1);
      S.globalAlpha = 1; S.drawImage(art.boss, bf * 48, 0, 48, 48, BOSS.x - 24, BOSS.y - 24, 48, 48);
      for (let i = 0; i < 5; i++) { const a = f * 0.07 + i * 1.26, x = BOSS.x + Math.cos(a) * 21, y = by + Math.sin(a) * 9; rect(S, x, y, 3, 2, "#D9CFBE", 0.85); rect(S, x, y, 3, 1, "#9C8E7A", 0.85); }
      if (st.hit > 0) rect(S, BOSS.x - 12, by - 15, 24, 29, "#FFFFFF", (0.35 * st.hit) / 4);
    }
    S.globalAlpha = 1;
    S.drawImage(pb, (f % FRAMES) * 64, 0, 64, 64, PB.x, PB.y, 64, 64);
    if (!dead) {
      if (stage === "end") for (let a = 0; a < 6.28; a += 0.08) rect(S, 26 + Math.cos(a + f * 0.05) * 16, 63 + Math.sin(a + f * 0.05) * 3, 1, 1, "#EE8A3C", 0.7);
      const pos = (sh: Shot, t: number) => {
        const k = Math.max(0, t);
        return [HAND.x + (BOSS.x - 6 - HAND.x) * k, HAND.y + (BOSS.y - HAND.y) * k - Math.sin(k * Math.PI) * sh.arc] as const;
      };
      for (const sh of st.shots) {
        if (sh.t < 0) continue;
        for (let k = 1; k <= (sh.missile ? 5 : 3); k++) { const [tx, ty] = pos(sh, sh.t - k * 0.03); rect(S, tx, ty, sh.s, sh.s, sh.c, 0.5 - k * 0.08); }
        const [x, y] = pos(sh, sh.t);
        rect(S, x - 1, y - 1, sh.s + 2, sh.s + 2, sh.c, 0.35); rect(S, x, y, sh.s, sh.s, "#FFFFFF");
      }
      if (st.beam > 0) {
        const x1 = BOSS.x - 6, n = Math.ceil(x1 - HAND.x);
        for (let i = 0; i <= n; i++) {
          const t = i / n, x = HAND.x + (x1 - HAND.x) * t, y = HAND.y + (BOSS.y - HAND.y) * t + Math.sin(i * 0.6 + f);
          rect(S, x, y - 3, 1, 7, "#EE8A3C", 0.35); rect(S, x, y - 2, 1, 5, "#F2C230", 0.7); rect(S, x, y - 1, 1, 2, "#FFFFFF");
        }
      }
      for (const p of st.sparks) rect(S, p.x, p.y, 1, 1, p.c, p.life / 14);
      S.font = `8px ${font.num}`; S.textBaseline = "top";
      for (const n of st.nums) {
        S.globalAlpha = Math.min(1, n.life / 10);
        S.fillStyle = "#000"; S.fillText(String(n.v), n.x + 1, n.y + 1);
        S.fillStyle = "#FFE680"; S.fillText(String(n.v), n.x, n.y);
      }
    }
    S.restore();
    S.globalAlpha = 1;
  });

  return (
    <canvas ref={ref} width={W} height={H} role="img"
      aria-label={stage === "dead" ? "บอสประจำเทอมล้มแล้ว ได้กล่องทอง" : "Pap-Boy ยิงสกิลใส่บอสประจำเทอม"}
      style={{ display: "block", width: "100%", aspectRatio: `${W} / ${H}`, imageRendering: "pixelated" }} />
  );
}

const shadow = { textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 };
const s = StyleSheet.create({
  scene: { position: "relative", backgroundColor: color.gameBar, borderBottomWidth: 1, borderBottomColor: color.seam, minHeight: 120 },
  bossbar: { position: "absolute", left: 10, right: 10, top: 8 },
  bn: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  bname: { flex: 1, fontFamily: font.bodyBold, fontSize: 14, color: color.bossText, ...shadow },
  bpct: { fontFamily: font.pixel, fontSize: 14, color: color.bossNum, ...shadow },
  hp: { height: 8, marginTop: 3, backgroundColor: color.gameDeep, borderWidth: 1, borderColor: color.bossLine },
  hpFill: { height: "100%", width: "100%", backgroundColor: color.blood, transformOrigin: "left" },
  ph: { position: "absolute", top: -3, bottom: -3, width: 2, backgroundColor: color.bone },
  st2: { fontFamily: font.body, fontSize: 14, color: color.bossSoft, marginTop: 2, ...shadow },
  skill: {
    position: "absolute", left: 10, bottom: 6, fontFamily: font.bodyBold, fontSize: 14, color: color.gold,
    backgroundColor: "rgba(6,5,4,0.8)", paddingHorizontal: 10, paddingVertical: 4,
  },
});
