import { Tabs } from "expo-router";
import { color, font } from "@/lib/theme";

export default function TabsLayout() {
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
      <Tabs.Screen name="game" options={{ title: "เกม" }} />
      <Tabs.Screen name="settings" options={{ title: "ตั้งค่า" }} />
    </Tabs>
  );
}
