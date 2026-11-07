import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth";
import { LvChip } from "@/components/game/LvChip";
import { color, font } from "@/lib/theme";

export default function TabsLayout() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  if (session === undefined) return null; // อ่าน session จากเครื่อง (เร็วมาก)
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.blue },
        headerTintColor: color.white,
        headerTitleStyle: { fontFamily: font.heading },
        tabBarActiveTintColor: color.blue,
        tabBarInactiveTintColor: color.sub,
        // ค่าเดิม 49 ไม่พอสำหรับไอคอน+ป้ายไทย · ขอบล่างอย่างน้อย 10 (แบบ LabHub: iPhone PWA ได้ insets = 0 แต่มีขีด Home)
        tabBarStyle: { height: 56 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10) },
        // ฟอนต์ไทยสูงกว่าละติน: ห้ามป้ายหด ไม่งั้นโดนบีบเหลือ ~10px แล้วตัวหนังสือขาด
        tabBarLabelStyle: { fontFamily: font.body, fontSize: 12, lineHeight: 18, flexShrink: 0 },
        sceneStyle: { backgroundColor: color.cream },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "วันนี้", headerRight: () => <LvChip /> }} />
      <Tabs.Screen name="subjects" options={{ title: "วิชา" }} />
      <Tabs.Screen name="tasks" options={{ title: "งาน" }} />
      <Tabs.Screen name="game" options={{ title: "เกม", headerStyle: { backgroundColor: color.gameBg }, headerTintColor: color.brass }} />
      <Tabs.Screen name="settings" options={{ title: "ตั้งค่า" }} />
    </Tabs>
  );
}
