import { Platform, View } from "react-native";
import { color } from "@/lib/theme";

// ไอคอนเส้นเหลี่ยมของแถบแท็บ (ธีม A: แผงหมึกเข้ม · ไอคอนสีเดียวกับป้าย)
// shortcut: วาดด้วย <svg> ของเบราว์เซอร์ (ไม่มี react-native-svg) → แอป native ไม่มีไอคอน เหลือแต่ป้าย; ถ้าทำแอป native ค่อยติดตั้ง react-native-svg
const PATHS = {
  today: <><rect x="3.5" y="5" width="17" height="15.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  subjects: <path d="M4 5h6l2 2v13l-2-2H4zM20 5h-6l-2 2v13l2-2h6z" />,
  tasks: <><rect x="4" y="4" width="16" height="16" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  game: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M12 8v8M9 11h6" /></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><rect x="14" y="5" width="4" height="4" /><rect x="8" y="15" width="4" height="4" /></>,
};

export function TabIcon({ name, focused, accent = color.go }: {
  name: keyof typeof PATHS; focused: boolean; accent?: string;
}) {
  const tint = focused ? accent : color.onMuted;
  return (
    <View style={{ width: 22, height: 22 }}>
      {/* ขีดสีเหนือแท็บที่เลือก: ชิดขอบบนของแถบ (ปุ่มแท็บเว้นบน 5 + ไอคอนอยู่กลางกล่องสูง 28) */}
      {focused && <View style={{ position: "absolute", top: -9, left: -9, width: 40, height: 3, backgroundColor: accent }} />}
      {Platform.OS === "web" && (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth={1.8} strokeLinecap="square" aria-hidden>
          {PATHS[name]}
        </svg>
      )}
    </View>
  );
}
