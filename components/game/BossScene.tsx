import { useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useLoop } from "@/components/game/loop";
import { BOSS, circ, type ClassId, drawBullet, MZ, PART, PB, POWER, rect, type Shot, shotPos, SKILLS } from "@/components/game/bossFx";
import type { BossStage } from "@/lib/boss";
import { CLASSES } from "@/lib/classes";
import { buildSheet, FRAMES, glowOf, itemById, type Look } from "@/lib/papboy";
import { color, font } from "@/lib/theme";

// ฉากสู้บอสประจำเทอม (b5-game.html) · canvas 128×72 ขยายแบบ pixelated · Pap-Boy ยิงสกิลจากปลายอาวุธใส่บอสเอง (ดูเฉย ๆ ไม่ต้องกด)
// ห้อง/ตัวบอส/Pap-Boy วาดครั้งเดียวเป็นภาพซ่อน → ต่อเฟรมแค่ drawImage + กระสุน ประกาย (เพดาน 150) เลขดาเมจ
// ท่า กระสุน ความอลังการ อยู่ใน bossFx.ts · บอส "อสูรกองข้อสอบ" ออกแบบเอง ไม่อิงเกมใด

const W = 128, H = 72;
const MAX_SPARKS = 150;

type Spark = { x: number; y: number; vx: number; vy: number; life: number; c: string; g?: number; k?: ClassId };
type Num = { x: number; y: number; life: number; v: number };

/** คลาสยังไม่เลือก = ท่าของนักจดซาก · มือเปล่า = กระสุนชิ้นแรกของคลาส ระดับปกติ */
function fxOf(look: Look, stage: BossStage) {
  const k = CLASSES.find((c) => c.id === look.cls) ?? CLASSES[0];
  const armed = look.held !== "none";
  const rarity = armed ? itemById(`held.${look.held}`)?.r ?? "n" : "n";
  return { cls: k.id as ClassId, weapon: armed ? look.held : k.weapons[0] as string, rarity, skill: stage === "dead" ? null : SKILLS[k.id as ClassId][stage] };
}

function canvas(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  return [cv, cv.getContext("2d")!] as const;
}

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
  const fx = fxOf(p.look, p.stage);
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
      <Text style={s.skill}>{fx.skill ? `สกิล: ${fx.skill.name}${fx.rarity === "u" ? " + ไม้ตาย" : ""}` : "เทอมนี้จบแล้ว"}</Text>
    </View>
  );
}

function SceneCanvas({ look, stage }: { look: Look; stage: BossStage }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const art = useMemo(() => ({ room: drawRoom(), boss: drawBossSheet(), dead: drawDead() }), []);
  const pb = useMemo(() => buildSheet(look), [look]);
  const g = useRef({ shots: [] as Shot[], sparks: [] as Spark[], nums: [] as Num[], rings: [] as { r: number; hit: boolean }[], pops: [] as { r: number; life: number }[], hit: 0, beam: 0, lock: 0, cone: 0, rune: false, flash: 0, shake: 0, fin: 0 });

  useLoop(ref, (f) => {
    const S = ref.current?.getContext("2d");
    if (!S) return;
    const st = g.current;
    const dead = stage === "dead";
    const glow = glowOf(look);
    const { cls, weapon, rarity, skill } = fxOf(look, stage);
    const P = POWER[rarity], part = PART[cls];

    const impact = (n: number, dmg: number) => {
      st.hit = 4;
      const cnt = Math.max(1, Math.round(n * P.mul));
      for (let i = 0; i < cnt && st.sparks.length < MAX_SPARKS; i++) {
        const a = Math.random() * 6.28, v = (0.4 + Math.random() * 0.9) * part.v;
        st.sparks.push({ x: BOSS.x - 6, y: BOSS.y + Math.random() * 10 - 5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - part.up, life: (10 + Math.random() * 8) | 0, c: glow, g: part.g, k: cls });
      }
      if (Math.random() < 0.5 && st.nums.length < 8) st.nums.push({ x: BOSS.x + 4 + Math.random() * 12, y: BOSS.y - 14, life: 22, v: dmg });
    };
    const spawn = (o: Partial<Shot> & { dmg: number }) => {
      const base: Shot = { t: 0, v: 0.07, path: "line", arc: 0, ...o };
      st.shots.push(base);
      st.flash = Math.max(st.flash, P.flash);
      for (let i = 1; i <= P.echo; i++) st.shots.push({ ...base, t: base.t - i * 0.13, ty: (base.ty ?? 0) + (i % 2 ? 6 : -6), dmg: 1 }); // นัดซ้อน
    };
    // ---- ลอจิก (ครั้งละ tick) ----
    if (!dead && f > 0) {
      st.rune = false;
      skill?.tick(f, { g: st, spawn, impact });
      for (const sh of st.shots) sh.t += sh.v;
      st.shots = st.shots.filter((sh) => {
        if (sh.t < 1) return true;
        impact(8, sh.dmg);
        for (let i = 0; i < P.ring && st.pops.length < 8; i++) st.pops.push({ r: 2 - i * 5, life: 7 + i * 2 });
        if (P.rank === 3) st.shake = Math.max(st.shake, 2);
        return false;
      });
      for (const r of st.rings) { r.r += 4; if (!r.hit && r.r >= BOSS.x - 6 - MZ.x) { r.hit = true; impact(6, 3); } }
      st.rings = st.rings.filter((r) => r.r < 72);
      for (const p of st.pops) { p.r += 2; p.life--; }
      st.pops = st.pops.filter((p) => p.life > 0);
      if (look.fx === "spark") for (const sh of st.shots) if (sh.t > 0 && f % 2 === 0 && st.sparks.length < MAX_SPARKS) { const [x, y] = shotPos(sh, sh.t); st.sparks.push({ x, y, vx: -0.3 - Math.random() * 0.4, vy: Math.random() * 0.6 - 0.3, life: 8, c: glow }); }
      for (const p of st.sparks) { p.x += p.vx; p.y += p.vy; p.vy += p.g ?? 0.05; p.life--; }
      st.sparks = st.sparks.filter((p) => p.life > 0);
      for (const n of st.nums) { n.y -= 0.4; n.life--; }
      st.nums = st.nums.filter((n) => n.life > 0);
      if (st.hit > 0) st.hit--;
      if (st.beam > 0) st.beam--;
      if (st.cone > 0) st.cone--;
      st.flash = Math.max(0, st.flash - 2);
      if (st.shake > 0) st.shake--;
      if (P.rank === 3 && f % 46 === 0) { st.fin = 14; st.shake = 8; } // ไม้ตายของ unique
      if (st.fin > 0) { if (st.fin % 3 === 0) { impact(8, 99); if (st.pops.length < 8) st.pops.push({ r: 3, life: 10 }); } st.fin--; }
    }
    // ---- วาด ----
    S.imageSmoothingEnabled = false;
    S.save();
    if ((st.beam > 0 || st.shake > 0) && f % 2) S.translate(st.shake > 4 ? 2 : 1, st.shake > 0 ? (f % 4 < 2 ? 1 : -1) : 0);
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
    if (!dead) {
      if (st.fin > 0) rect(S, 0, 0, W, H, "#000000", 0.5); // ไม้ตาย: ห้องมืดลงให้ลำแสงเด่น
      if (st.rune) for (let a = 0; a < 6.28; a += 0.08) rect(S, 62 + Math.cos(a + f * 0.05) * 22, 63 + Math.sin(a + f * 0.05) * 3, 1, 1, glow, 0.7);
      if (P.rank >= 2) for (let x = -18; x <= 18; x++) rect(S, 26 + x, 63, 1, 2, glow, (1 - Math.abs(x) / 19) * (P.rank === 3 ? 0.7 : 0.35));
      if (P.rank === 3) for (let i = 0; i < 9; i++) { const y = 62 - ((f * 1.4 + i * 9) % 44), x = 26 + Math.sin(i * 2.1 + f * 0.1) * 17; rect(S, x, y, 1, 2, glow, Math.max(0, 1 - (62 - y) / 46)); }
    }
    S.globalAlpha = 1;
    S.drawImage(pb, (f % FRAMES) * 64, 0, 64, 64, PB.x, PB.y, 64, 64);
    if (!dead) {
      if (st.cone > 0) for (let x = MZ.x; x < W; x++) {
        const u = (x - MZ.x) / (BOSS.x - MZ.x), half = 2 + (x - MZ.x) * 0.36, cy = MZ.y + (BOSS.y - MZ.y) * u;
        rect(S, x, cy - half, 1, half * 2, "#FFE680", 0.12); rect(S, x, cy - half / 2, 1, half, "#FFF6C8", 0.14);
      }
      for (const r of st.rings) for (let a = -0.9; a <= 0.9; a += 0.05) rect(S, MZ.x + Math.cos(a) * r.r, MZ.y + Math.sin(a) * r.r * 0.8, 1, 1, glow, Math.max(0.15, 0.9 - r.r / 80));
      for (const sh of st.shots) {
        if (sh.t < 0) continue;
        for (let k = 1; k <= P.trail; k++) {
          const [tx, ty] = shotPos(sh, sh.t - k * 0.03), a = Math.max(0.08, 0.6 - k * 0.06);
          if (cls === "scribe") rect(S, tx, ty + k * 0.7, 2, 2, glow, a); // หมึกหยดลง
          else if (cls === "deadline") rect(S, tx - 5, ty, 7, 1, glow, a); // เส้นความเร็ว
          else if (cls === "survivor") circ(S, tx, ty, k > 3 ? 2 : 1, glow, a * 0.6); // ควันฝุ่น
          else rect(S, tx, ty + Math.sin(k + f * 0.6) * 2, 2, 2, glow, a); // วิญญาณส่าย
          if (P.scale > 1) rect(S, tx, ty - 2, 2, 5, glow, a * 0.35);
        }
        if (look.fx === "binary") for (let k = 1; k <= 3; k++) {
          const [tx, ty] = shotPos(sh, sh.t - k * 0.05), a = 0.75 - k * 0.15;
          if ((k + (f >> 2)) % 2) rect(S, tx, ty - 4, 1, 3, "#86D99B", a);
          else { rect(S, tx, ty - 4, 3, 1, "#86D99B", a); rect(S, tx, ty - 2, 3, 1, "#86D99B", a); rect(S, tx, ty - 3, 1, 1, "#86D99B", a); rect(S, tx + 2, ty - 3, 1, 1, "#86D99B", a); }
        }
        const [x, y] = shotPos(sh, sh.t);
        if (P.rank === 3) circ(S, x, y, 8, glow, 0.16);
        if (P.scale === 1) drawBullet(S, weapon, x, y, f, glow);
        else { S.save(); S.translate(Math.round(x), Math.round(y)); S.scale(P.scale, P.scale); drawBullet(S, weapon, 0, 0, f, glow); S.restore(); }
        if (sh.tag) { S.globalAlpha = 1; S.font = `8px ${font.num}`; S.textBaseline = "top"; S.fillStyle = "#000"; S.fillText(sh.tag, x - 1, y - 11); S.fillStyle = "#FFE680"; S.fillText(sh.tag, x - 2, y - 12); }
      }
      if (st.lock > 0) {
        const r = Math.max(8, 26 - st.lock), c = st.lock % 4 < 2 ? "#FF5A5A" : "#FFE680", cx = BOSS.x - 2, cy = BOSS.y;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { rect(S, cx + sx * r - (sx > 0 ? 3 : 0), cy + sy * r, 4, 1, c); rect(S, cx + sx * r, cy + sy * r - (sy > 0 ? 3 : 0), 1, 4, c); }
        rect(S, cx - 1, cy, 3, 1, c); rect(S, cx, cy - 1, 1, 3, c);
      }
      if (st.beam > 0) for (let x = MZ.x; x < W; x++) {
        const y = MZ.y + (BOSS.y - MZ.y) * ((x - MZ.x) / (BOSS.x - 6 - MZ.x));
        rect(S, x, y - 2, 1, 5, glow, 0.4); rect(S, x, y, 1, 1, "#FFFFFF");
      }
      if (st.flash > 0) {
        circ(S, MZ.x, MZ.y, st.flash, glow, 0.45); circ(S, MZ.x, MZ.y, Math.ceil(st.flash / 2), "#FFFFFF", 0.8);
        if (P.rank === 3) { rect(S, MZ.x - 9, MZ.y, 19, 1, "#FFFFFF", 0.7); rect(S, MZ.x, MZ.y - 9, 1, 19, "#FFFFFF", 0.7); }
      }
      if (st.fin > 0) for (let x = MZ.x; x < W; x++) {
        const y = MZ.y + (BOSS.y - MZ.y) * ((x - MZ.x) / (BOSS.x - 6 - MZ.x)) + Math.sin(x * 0.5 + f);
        rect(S, x, y - 7, 1, 15, glow, 0.35); rect(S, x, y - 4, 1, 9, glow, 0.8); rect(S, x, y - 1, 1, 3, "#FFFFFF");
      }
      for (const p of st.pops) if (p.r > 0) for (let a = 0; a < 6.28; a += 0.12) rect(S, BOSS.x - 6 + Math.cos(a) * p.r, BOSS.y + Math.sin(a) * p.r, 1, 1, glow, p.life / 8);
      for (const p of st.sparks) {
        const a = Math.min(1, p.life / 14);
        if (p.k === "scribe") { const z = p.life > 6 ? 2 : 1; rect(S, p.x, p.y, z, z, p.c, a); }
        else if (p.k === "deadline") { rect(S, p.x - 1, p.y, 4, 1, "#FFFFFF", a); rect(S, p.x + 3, p.y, 1, 1, p.c, a); }
        else if (p.k === "survivor") { const z = p.life > 9 ? 2 : 4; rect(S, p.x - z / 2, p.y - z / 2, z, z, p.c, a * 0.4); } // ฝุ่น: สี่เหลี่ยมแทนวงกลม ประหยัดการวาด
        else if (p.k === "necro") rect(S, p.x + Math.sin(p.life * 0.7), p.y, 1, 3, p.c, a);
        else rect(S, p.x, p.y, 1, 1, p.c, a);
      }
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
