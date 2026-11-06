import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Platform } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 7 * 24 * 60 * 60 * 1000, retry: 1 },
  },
});

// เปิดแอปแล้วเห็นข้อมูลจากแคชทันที แล้วค่อยอัปเดตจากเซิร์ฟเวอร์
// shortcut: เก็บแคชลงเครื่องเฉพาะเว็บ (localStorage) — ถ้าทำแอปมือถือจริงค่อยเพิ่ม async-storage persister
export const persister =
  Platform.OS === "web" && typeof window !== "undefined"
    ? createSyncStoragePersister({ storage: window.localStorage, key: "sq-cache" })
    : undefined;

// เปลี่ยนเมื่อโครงข้อมูลในแคชเปลี่ยน → แคชเก่าถูกทิ้ง
export const CACHE_BUSTER = "stage1-v1";
