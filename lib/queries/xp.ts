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
