import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { DEFAULT_LOOK, drawPapBoy, type Item } from "@/lib/papboy";
import type { BoxKind } from "@/lib/queries/loot";

// ภาพนิ่งหน้าเกม (วาดเอง · เว็บเท่านั้น): ไอคอนกล่อง 24×24 + รูปย่อของในตู้แต่งตัว

const BOXC: Record<BoxKind, [string, string, string]> = {
  iron: ["#5E5A57", "#8C8782", "#3A3735"], silver: ["#9AA3B2", "#D6DCE5", "#5D6573"], gold: ["#9C7A3C", "#E2C27A", "#6A5228"],
};

/** กล่อง (ฝาเปิดขึ้นได้ lidUp px) ลง ctx ที่ (ox,oy) ขยาย sc เท่า */
export function drawBox(S: CanvasRenderingContext2D, k: BoxKind, ox: number, oy: number, sc = 1, lidUp = 0) {
  const [m, l, d] = BOXC[k];
  const r = (x: number, y: number, w: number, h: number, c: string) => { S.fillStyle = c; S.fillRect(ox + x * sc, oy + y * sc, w * sc, h * sc); };
  r(2, 9, 20, 13, "#120F0D"); r(3, 10, 18, 11, m); r(3, 10, 18, 2, l); r(3, 15, 18, 1, d); r(11, 10, 2, 11, d); r(10, 14, 4, 3, l); r(11, 15, 2, 1, "#120F0D");
  r(1, 4 - lidUp, 22, 6, "#120F0D"); r(2, 5 - lidUp, 20, 4, l); r(2, 8 - lidUp, 20, 1, d); r(11, 5 - lidUp, 2, 4, d);
}

export function BoxIcon({ kind, size = 52, dim = false }: { kind: BoxKind; size?: number; dim?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const S = ref.current?.getContext("2d");
    if (S) { S.clearRect(0, 0, 24, 24); drawBox(S, kind, 0, 0); }
  }, [kind]);
  if (Platform.OS !== "web") return null;
  return <canvas ref={ref} width={24} height={24} aria-hidden
    style={{ width: size, height: size, imageRendering: "pixelated", background: "#060504", opacity: dim ? 0.4 : 1, display: "block" }} />;
}

// รูปย่อ: ตัดเฉพาะส่วนที่เกี่ยว [x, y, ขนาด] · ไม่มี = ทั้งภาพ
const CROP: Partial<Record<string, [number, number, number]>> = {
  glow: [14, 8, 36], mouth: [14, 8, 36], eyes: [14, 8, 36], ears: [12, 2, 40], hat: [12, 2, 40],
  outfit: [14, 24, 36], scarf: [14, 24, 36], shoes: [18, 38, 26], held: [24, 24, 34], pet: [38, 10, 26],
};

export function Thumb({ item, size, locked = false }: { item: Item; size: number; locked?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const t = ref.current?.getContext("2d");
    if (!t) return;
    const off = document.createElement("canvas");
    off.width = off.height = 64;
    drawPapBoy(off.getContext("2d")!, { ...DEFAULT_LOOK, [item.k]: item.v }, 3, true);
    const [x, y, w] = CROP[item.k] ?? [0, 0, 64];
    t.imageSmoothingEnabled = false;
    t.clearRect(0, 0, 64, 64);
    t.drawImage(off, x, y, w, w, 0, 0, 64, 64);
  }, [item]);
  if (Platform.OS !== "web") return null;
  return <canvas ref={ref} width={64} height={64} aria-hidden style={{ width: size, height: size, imageRendering: "pixelated", display: "block", filter: locked ? "grayscale(1) brightness(.35)" : undefined }} />;
}
