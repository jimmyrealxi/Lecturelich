import { useEffect, useState } from "react";
import { Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// shortcut: ตัววัดชั่วคราวสำหรับไล่บั๊กจอ iPhone PWA — ลบไฟล์นี้ + บรรทัดที่เรียกใน (tabs)/_layout.tsx หลังแก้เสร็จ
export function DebugViewport() {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState("");
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const read = () => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0;height:100vh;width:0";
      document.body.appendChild(probe);
      const cs = getComputedStyle(probe);
      const env = `${cs.paddingTop}/${cs.paddingBottom}`;
      const vh = probe.getBoundingClientRect().height;
      probe.remove();
      const root = document.getElementById("root")?.getBoundingClientRect();
      const standalone = matchMedia("(display-mode: standalone)").matches;
      setInfo(
        `inner ${innerWidth}x${innerHeight} · vv ${Math.round(visualViewport?.height ?? 0)} · screen ${screen.height}` +
        ` · 100vh ${Math.round(vh)} · root ${Math.round(root?.top ?? 0)}+${Math.round(root?.height ?? 0)}` +
        ` · env ${env} · ctx ${insets.top}/${insets.bottom} · sa ${standalone}`,
      );
    };
    read();
    addEventListener("resize", read);
    return () => removeEventListener("resize", read);
  }, [insets.top, insets.bottom]);
  if (!info) return null;
  return (
    <Text style={{ position: "absolute", top: 120, left: 8, right: 8, zIndex: 999, backgroundColor: "#000c", color: "#fff", fontSize: 11, padding: 6 }}>
      {info}
    </Text>
  );
}
