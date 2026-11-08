import { useMemo, useRef } from "react";
import { Platform } from "react-native";
import { useLoop } from "@/components/game/loop";
import { buildSheet, FRAMES, type Look, type Pose } from "@/lib/papboy";

/** Pap-Boy ขยับ (sprite sheet วาดครั้งเดียวต่อชุด) · เว็บเท่านั้น (แอปหลักเป็น PWA) */
export function PapBoySprite({ look, size, bg = false, label = "Pap-Boy" }: { look: Look; size: number; bg?: boolean; label?: string }) {
  if (Platform.OS !== "web") return null;
  return <Sprite look={look} size={size} bg={bg} label={label} />;
}

/** มุมหน้าวันนี้: ตัดกรอบ 52×59 จาก 64 ขยาย 2 เท่า (พอดีชุดที่กินที่สุด: หูกระต่าย ท่าชูมือ ดิสก์บิน ออร่าพื้น) · sheet สร้างเมื่อใช้ท่านั้นครั้งแรก */
export function PapBoyBuddy({ look, pose }: { look: Look; pose: Pose }) {
  if (Platform.OS !== "web") return null;
  return <Buddy look={look} pose={pose} />;
}

const buddySheets = new WeakMap<Look, Map<Pose, HTMLCanvasElement>>();

function buddySheet(look: Look, pose: Pose) {
  let poses = buddySheets.get(look);
  if (!poses) buddySheets.set(look, (poses = new Map()));
  let sheet = poses.get(pose);
  if (!sheet) poses.set(pose, (sheet = buildSheet(look, false, pose)));
  return sheet;
}

function Buddy({ look, pose }: { look: Look; pose: Pose }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLoop(ref, (n) => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 52, 59);
    ctx.drawImage(buddySheet(look, pose), (n % FRAMES) * 64 + 8, 0, 52, 59, 0, 0, 52, 59);
  });
  return <canvas ref={ref} width={52} height={59} aria-hidden style={{ width: 104, height: 118, imageRendering: "pixelated", display: "block" }} />;
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
