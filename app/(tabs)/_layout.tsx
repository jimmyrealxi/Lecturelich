import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth";
import { useAssignments } from "@/lib/queries/core";
import { TabIcon } from "@/components/TabIcon";
import { Platform } from "react-native";
import { color, font, PAPER_INSET } from "@/lib/theme";

export default function TabsLayout() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const tasks = useAssignments();
  if (session === undefined) return null; // อ่าน session จากเครื่อง (เร็วมาก)
  if (!session) return <Redirect href="/login" />;
  const pending = (tasks.data ?? []).filter((a) => !a.done).length;

  return (
    <Tabs
      screenOptions={{
        // หัวแบบสมุด: โปร่งบนกระดาษ หัว Chonburi เส้นคู่ใต้หัว
        headerStyle: { backgroundColor: "transparent", borderBottomWidth: 3, borderBottomColor: "rgba(42,33,24,0.75)", borderStyle: "double" as "solid" },
        headerShadowVisible: false,
        headerTintColor: color.paper,
        headerTitleStyle: { fontFamily: font.title, fontSize: 24, color: color.paper },
        // แผงหมึกเข้ม (ธีม A) · เหลืองใช้ได้เพราะอยู่บนพื้นเข้ม
        tabBarActiveTintColor: color.go,
        tabBarInactiveTintColor: color.onMuted,
        // แผงทึบติดขอบล่าง · ค่าเดิม 49 ไม่พอสำหรับไอคอน+ป้ายไทย · ขอบล่างอย่างน้อย 10 (แบบ LabHub: iPhone PWA ได้ insets = 0 แต่มีขีด Home)
        tabBarStyle: {
          height: 56 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: color.paper, borderTopWidth: 0,
        },
        // ฟอนต์ไทยสูงกว่าละติน: ห้ามป้ายหด ไม่งั้นโดนบีบเหลือ ~10px แล้วตัวหนังสือขาด
        tabBarLabelStyle: { fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 18, flexShrink: 0 },
        tabBarBadgeStyle: {
          fontFamily: font.typeBold, fontSize: 12, lineHeight: 17, color: color.paper, backgroundColor: color.go,
          borderRadius: 2, minWidth: 18, height: 17, paddingHorizontal: 4,
        },
        sceneStyle: { backgroundColor: "transparent", paddingLeft: Platform.OS === "web" ? PAPER_INSET : 0 },
        // ฉากโปร่ง → แท็บที่ไม่ได้เปิดถูกซ่อนแค่ zIndex -1 เลยโผล่ทับ · fade ทำให้ฉากนั้น opacity 0 (ตั้ง 0ms = สลับทันที)
        animation: "fade",
        transitionSpec: { animation: "timing", config: { duration: 0 } },
      }}
    >
      <Tabs.Screen name="today" options={{
        title: "วันนี้", headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name="today" focused={focused} />,
      }} />
      <Tabs.Screen name="subjects" options={{
        title: "วิชา", tabBarIcon: ({ focused }) => <TabIcon name="subjects" focused={focused} />,
      }} />
      <Tabs.Screen name="tasks" options={{
        title: "งาน", tabBarBadge: pending || undefined,
        tabBarAccessibilityLabel: pending ? `งาน ค้าง ${pending} เรื่อง` : "งาน",
        tabBarIcon: ({ focused }) => <TabIcon name="tasks" focused={focused} />,
      }} />
      <Tabs.Screen name="game" options={{
        title: "เกม", sceneStyle: { backgroundColor: color.cave }, headerStyle: { backgroundColor: color.cave, borderBottomWidth: 1, borderBottomColor: color.seam },
        headerTintColor: color.gold, tabBarActiveTintColor: color.gold, headerTitleStyle: { fontFamily: font.title, fontSize: 20, color: color.gold },
        tabBarIcon: ({ focused }) => <TabIcon name="game" focused={focused} accent={color.gold} />,
      }} />
      <Tabs.Screen name="settings" options={{
        title: "ตั้งค่า", tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
      }} />
    </Tabs>
  );
}
