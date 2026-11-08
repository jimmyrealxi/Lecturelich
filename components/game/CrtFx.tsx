import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CELL, drawScene, pickScene, REVEAL, scenePool, SLOW, type CrtKind, type Scene } from "@/lib/crtArt";
import { crtGlow, color, font } from "@/lib/theme";

// ภาพตอนกดปุ่มบนจอเขียว (docs/mockups/a-crt-effects.html): เล่นทับจอ แตะเพื่อข้าม · ข้อมูลบันทึกแล้วตั้งแต่ตอนกด ไม่รอภาพจบ

type Play = { n: number; scene: Scene; sub?: string };

/** start = เล่นภาพแบบสุ่มของปุ่มนี้ (ไม่ซ้ำแบบล่าสุด) · sub = ข้อความเล็กข้างป้าย เช่น "+5 XP" */
export function useCrtFx() {
  const [play, setPlay] = useState<Play | null>(null);
  const last = useRef<Partial<Record<CrtKind, number>>>({});
  const n = useRef(0);
  const start = useCallback((kind: CrtKind, sub?: string, lastMinute = false) => {
    const pool = scenePool(kind, lastMinute);
    const i = pickScene(pool.length, last.current[kind] ?? -1);
    last.current[kind] = i;
    setPlay({ n: ++n.current, scene: pool[i], sub });
  }, []);
  const stop = useCallback(() => setPlay(null), []);
  return { play, start, stop };
}

const isReduced = () => Platform.OS !== "web" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** ใส่เป็น overlay ของ Crt · ลดการเคลื่อนไหว = ขึ้นแค่ป้ายข้อความ */
export function CrtStage({ play, onEnd }: { play: Play; onEnd: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [reduced] = useState(isReduced);
  const [say, setSay] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onEnd, 1200);
      return () => clearTimeout(t);
    }
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return onEnd();
    const W = (cv.width = Math.floor(cv.clientWidth / CELL));
    const H = (cv.height = Math.floor(cv.clientHeight / CELL));
    const ms = play.scene.ms * SLOW;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      drawScene(g, W, H, t, play.scene);
      if (t >= REVEAL) setSay(true);
      if (t < 1) raf = requestAnimationFrame(step);
      else onEnd();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [play, onEnd, reduced]);

  const sub = play.sub;
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onEnd} accessibilityRole="button" accessibilityLabel="ข้ามภาพ">
      {!reduced && <canvas ref={ref} aria-hidden style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "calc(100% - 36px)", imageRendering: "pixelated" }} />}
      <View style={[s.say, !say && { opacity: 0 }]} accessibilityLiveRegion="polite">
        <Text style={s.label}>{play.scene.label}{!!sub && <Text style={sub.startsWith("+") ? s.num : s.sub}>{`  ${sub}`}</Text>}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  say: { position: "absolute", left: 8, right: 8, bottom: 8, alignItems: "center" },
  label: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 22, color: color.crtOn, textAlign: "center", ...crtGlow.title },
  sub: { fontFamily: font.bodyMedium, color: "#B8FFC9" },
  num: { fontFamily: font.num, fontSize: 19, color: "#B8FFC9" }, // VT323 ไม่มีตัวไทย ใช้เฉพาะ +XP
});
