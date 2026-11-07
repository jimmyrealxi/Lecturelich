import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fullLook, type Look, type Rarity, type Slot } from "@/lib/papboy";

// กล่อง + ของแต่งตัว (ขั้น 7 · migration 20261113090000_stage7_loot.sql) · สุ่ม/ปลดล็อก/ใส่ของ ทำใน RPC ทั้งหมด
// key ขึ้นต้น "xp" → ได้ XP แล้ว (invalidate ["xp"] หลังทุก mutation) กล่องใหม่โผล่เอง
// ยังไม่รัน migration → RPC error → useLoot().data เป็น undefined → หน้าเกมซ่อนส่วนกล่อง/แต่งตัว ไม่พัง

export type BoxKind = "iron" | "silver" | "gold";
export type LootState = {
  look: Look;
  chalk: number;
  pity: number;
  boxes: { id: string; kind: BoxKind }[];
  owned: string[];
  recent: { item_id: string; at: string; chalk: number }[];
  today_boxes: number;
  today_items: string[];
};
export type Opened = { item_id: string; rarity: Rarity; chalk: number };

export const lootKey = ["xp", "loot"] as const;

export function useLoot() {
  return useQuery({
    queryKey: lootKey,
    retry: false, // ยังไม่รัน migration = error ถาวร ไม่ต้องลองซ้ำ
    queryFn: async () => {
      const { data, error } = await supabase.rpc("loot_state");
      if (error) throw error;
      const d = data as Omit<LootState, "look"> & { look: Record<string, string> };
      return { ...d, look: fullLook(d.look) } as LootState;
    },
  });
}

/** เปิดกล่อง · ผลสุ่มมาจาก DB (ไม่ optimistic: ต้องรอผล) · โหลดสถานะใหม่หลังจอเล่นจบผ่าน invalidate ของ queryClient */
export function useOpenBox() {
  return useMutation({
    mutationFn: async (boxId: string) => {
      const { data, error } = await supabase.rpc("open_box", { p_box: boxId });
      if (error) throw error;
      return data as Opened;
    },
  });
}

/** ใส่/ถอด (optimistic: เปลี่ยนชุดทันที ล้มเหลวค่อยย้อน) */
export function useEquip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slot, value }: { slot: Slot; value: string }) => {
      const { error } = await supabase.rpc("equip_item", { p_slot: slot, p_value: value });
      if (error) throw error;
    },
    onMutate: async ({ slot, value }) => {
      await qc.cancelQueries({ queryKey: lootKey });
      const prev = qc.getQueryData<LootState>(lootKey);
      if (prev) qc.setQueryData<LootState>(lootKey, { ...prev, look: { ...prev.look, [slot]: value } });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(lootKey, ctx.prev);
    },
  });
}
