import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth";
import { useAssignments } from "@/lib/queries/core";
import { TabIcon } from "@/components/TabIcon";
import { color, font } from "@/lib/theme";

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
        headerStyle: { backgroundColor: color.navyDeep, borderBottomWidth: 3, borderBottomColor: color.go },
        headerShadowVisible: false,
        headerTintColor: color.onNavy,
        headerTitleStyle: { fontFamily: font.title, fontSize: 20, color: color.go },
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
        sceneStyle: { backgroundColor: color.ink },
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
        title: "เกม", headerStyle: { backgroundColor: color.cave, borderBottomWidth: 1, borderBottomColor: color.seam },
        headerTintColor: color.gold, tabBarActiveTintColor: color.gold, headerTitleStyle: { fontFamily: font.title, fontSize: 20, color: color.gold },
        tabBarIcon: ({ focused }) => <TabIcon name="game" focused={focused} accent={color.gold} />,
      }} />
      <Tabs.Screen name="settings" options={{
        title: "ตั้งค่า", tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
      }} />
    </Tabs>
  );
}
