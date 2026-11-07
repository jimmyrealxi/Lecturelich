import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// XP / เลเวล คำนวณใน DB (RPC xp_overview) · XP ได้จาก trigger ตอนเช็กชื่อ / จดโน้ต / ส่งงาน
// queryClient สั่งโหลดใหม่หลังทุก mutation (ดู lib/queryClient.ts) → ตัวเลขขยับเองและ XpPop เด้ง

export type Level = { xp: number; level: number; into: number; need: number };
export type XpOverview = {
  total: Level;
  subjects: (Level & { subject_id: string; name: string; color: string })[];
};

export const xpKey = ["xp"] as const;

export function useXp(enabled = true) {
  return useQuery({
    queryKey: xpKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("xp_overview");
      if (error) throw error;
      return data as XpOverview;
    },
  });
}

/** XP ที่ได้วันนี้ (เวลาไทย) · key ขึ้นต้น xpKey → invalidate XP แล้วอัปเดตด้วย */
export function useXpToday(date: string) {
  return useQuery({
    queryKey: [...xpKey, "today", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("xp_events").select("xp").eq("day", date);
      if (error) throw error;
      return { xp: data.reduce((n, r) => n + r.xp, 0), count: data.length };
    },
  });
}
