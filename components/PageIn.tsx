import { useEffect, useState, type ReactElement } from "react";
import { Platform, StyleSheet, View } from "react-native";

// เอฟเฟกต์เปลี่ยนหน้า: หน้าที่เข้ามาค่อยโผล่ + ลอยขึ้น 8px (หน้าเก่าหายทันที เพราะพื้นหน้าโปร่ง ถ้าเฟดซ้อนกันตัวหนังสือจะทับกัน)
// ใช้ CSS keyframes ของเว็บ → เบราว์เซอร์เล่นเองบน GPU ไม่ผ่าน JS ทุกเฟรม · ลดการเคลื่อนไหว = ไม่เล่น · native = ไม่มีเอฟเฟกต์
// สลับ 2 คลาสที่ keyframes ต่างกันนิดเดียว (ชื่อ animation เปลี่ยน → เล่นใหม่) โดยไม่ remount หน้า (state ในหน้าไม่หาย)
// react-native-web รับ animationKeyframes เฉพาะใน StyleSheet.create (inline ไม่รองรับ)

const reduced = Platform.OS === "web" && typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const anim = (startOpacity: number) => ({
  flex: 1,
  animationKeyframes: [{ from: { opacity: startOpacity, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0px)" } }],
  animationDuration: "220ms",
  animationTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  animationFillMode: "backwards", // จบแล้วไม่ค้าง transform (ไม่งั้น position: fixed ข้างในเพี้ยน)
});
const s = StyleSheet.create({ a: anim(0) as object, b: anim(0.01) as object });

type Nav = { addListener: (e: "focus", cb: () => void) => () => void };

export function PageIn({ navigation, route, children }: { navigation: Nav; route: { name: string }; children: ReactElement }) {
  const [n, setN] = useState(0);
  useEffect(() => navigation.addListener("focus", () => setN((x) => x + 1)), [navigation]);
  // กลุ่มแท็บไม่ขยับทั้งก้อน (แถบแท็บต้องนิ่ง) · หน้าในแท็บเล่นเอง
  if (Platform.OS !== "web" || reduced || route.name === "(tabs)") return children;
  return <View style={n % 2 ? s.a : s.b}>{children}</View>;
}
