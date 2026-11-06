import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";

// ค่าจาก .env (ดู .env.example) — anon key เปิดเผยได้ สิทธิ์จริงอยู่ที่ RLS
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseConfigured = url !== "" && anonKey !== "";

const isWeb = Platform.OS === "web";

export const supabase = createClient(url || "http://localhost", anonKey || "missing", {
  auth: {
    storage: isWeb ? undefined : AsyncStorage, // เว็บ = localStorage ค่าเริ่มต้น
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: isWeb, // เว็บ: กลับจาก Google แล้ว supabase-js อ่าน token จาก URL เอง
  },
});

// มือถือ: ต่ออายุ token เฉพาะตอนแอปเปิดอยู่ (คำแนะนำของ Supabase สำหรับ React Native)
if (!isWeb) {
  AppState.addEventListener("change", (s) => {
    if (s === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** id ผู้ใช้จาก session ในเครื่อง (ไม่ยิงเซิร์ฟเวอร์แบบ auth.getUser — ประหยัด Disk IO) */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  return id;
}
