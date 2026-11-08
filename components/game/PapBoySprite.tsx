import { useMemo, useRef } from "react";
import { Platform } from "react-native";
import { useLoop } from "@/components/game/loop";
import { buildSheet, FRAMES, type Look, type Pose } from "@/lib/papboy";

/** Pap-Boy ขยับ (sprite sheet วาดครั้งเดียวต่อชุด) · เว็บเท่านั้น (แอปหลักเป็น PWA) */
export function PapBoySprite({ look, size, bg = false, label = "Pap-Boy" }: { look: Look; size: number; bg?: boolean; label?: string }) {
  if (Platform.OS !== "web") return null;
  return <Sprite look={look} size={size} bg={bg} label={label} />;
}

/** มุมหน้าวันนี้: ตัดกรอบ 48×54 จาก 64 ขยาย 2 เท่า (เผื่อหูกระต่าย) · sheet สร้างเมื่อใช้ท่านั้นครั้งแรก */
export function PapBoyBuddy({ look, pose }: { look: Look; pose: Pose }) {
  if (Platform.OS !== "web") return null;
  return <Buddy look={look} pose={pose} />;
}

function Buddy({ look, pose }: { look: Look; pose: Pose }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sheets = useMemo(() => new Map<Pose, HTMLCanvasElement>(), [look]);
  useLoop(ref, (n) => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let sheet = sheets.get(pose);
    if (!sheet) sheets.set(pose, (sheet = buildSheet(look, false, pose)));
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 48, 54);
    ctx.drawImage(sheet, (n % FRAMES) * 64 + 8, 2, 48, 54, 0, 0, 48, 54);
  });
  return <canvas ref={ref} width={48} height={54} aria-hidden style={{ width: 96, height: 108, imageRendering: "pixelated", display: "block" }} />;
}

function Sprite({ look, size, bg, label }: { look: Look; size: number; bg: boolean; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sheet = useMemo(() => buildSheet(look, bg), [look, bg]);
  useLoop(ref, (n) => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(sheet, (n % FRAMES) * 64, 0, 64, 64, 0, 0, 64, 64);
  });
  return (
    <canvas ref={ref} width={64} height={64} role="img" aria-label={label}
      style={{ width: size, height: size, imageRendering: "pixelated", display: "block" }} />
  );
}
