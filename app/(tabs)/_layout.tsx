import { Redirect, Tabs } from "expo-router";
import { useSession } from "@/lib/auth";
import { color, font } from "@/lib/theme";

export default function TabsLayout() {
  const session = useSession();
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
        tabBarLabelStyle: { fontFamily: font.body, fontSize: 12 },
        sceneStyle: { backgroundColor: color.cream },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "วันนี้" }} />
      <Tabs.Screen name="subjects" options={{ title: "วิชา" }} />
      <Tabs.Screen name="tasks" options={{ title: "งาน" }} />
      <Tabs.Screen name="game" options={{ title: "เกม", headerStyle: { backgroundColor: color.gameBg }, headerTintColor: color.brass }} />
      <Tabs.Screen name="settings" options={{ title: "ตั้งค่า" }} />
    </Tabs>
  );
}
