import { useMemo, useRef } from "react";
import { Platform } from "react-native";
import { useLoop } from "@/components/game/loop";
import { buildSheet, FRAMES, type Look } from "@/lib/papboy";

/** Pap-Boy ขยับ (sprite sheet วาดครั้งเดียวต่อชุด) · เว็บเท่านั้น (แอปหลักเป็น PWA) */
export function PapBoySprite({ look, size, bg = false, label = "Pap-Boy" }: { look: Look; size: number; bg?: boolean; label?: string }) {
  if (Platform.OS !== "web") return null;
  return <Sprite look={look} size={size} bg={bg} label={label} />;
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
