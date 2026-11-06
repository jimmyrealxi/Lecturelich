import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/** session ปัจจุบัน · undefined = กำลังอ่านจากเครื่อง */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

// shortcut: ล็อกอิน Google รองรับแค่เว็บ (แอปเป็น PWA) — ถ้าทำแอปมือถือจริง ให้ยกแบบ deep link จาก lib/googleAuth.ts ของ LabHub
export async function signInWithGoogle() {
  if (Platform.OS !== "web") throw new Error("ตอนนี้ล็อกอินได้บนเว็บเท่านั้น");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
  });
  if (error) throw error;
}

export const signOut = () => supabase.auth.signOut({ scope: "local" });
