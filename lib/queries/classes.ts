import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// คลาสรายเทอม (migration ขั้น 9) · ตรวจสิทธิ์และวันเปิดสายย่อยใน RPC · ยังไม่รัน migration = error → หน้าเกมซ่อนแถบคลาส
// key ขึ้นต้น "xp" → เลือกแล้ว invalidate ["xp"] ให้ useLoot ได้ร่างใหม่ด้วย

export type ClassState = { term_id: string | null; class_id?: string | null; ascendancy_id?: string | null; asc_on?: string; asc_open?: boolean };

export function useClassState() {
  return useQuery({
    queryKey: ["xp", "class"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("class_state");
      if (error) throw error;
      return data as ClassState;
    },
  });
}

function usePick(fn: "pick_class" | "pick_ascendancy", arg: "p_class" | "p_asc") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc(fn, { [arg]: id });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["xp"] }),
  });
}

export const usePickClass = () => usePick("pick_class", "p_class");
export const usePickAscendancy = () => usePick("pick_ascendancy", "p_asc");
