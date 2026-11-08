import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fitsClass } from "@/lib/classes";
import { DEFAULT_LOOK, fullLook, type Look, type Rarity, type Slot } from "@/lib/papboy";

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
      // คลาส (migration ขั้น 9) ยังไม่รัน = error ข้ามไป ตัวละครเป็นร่างเดิม
      const [{ data, error }, cls] = await Promise.all([supabase.rpc("loot_state"), supabase.rpc("class_state")]);
      if (error) throw error;
      const d = data as Omit<LootState, "look"> & { look: Record<string, string> };
      const k = (cls.data ?? null) as { class_id?: string | null; ascendancy_id?: string | null } | null;
      const look: Look = { ...fullLook(d.look), cls: k?.class_id ?? null, asc: k?.ascendancy_id ?? null };
      if (!fitsClass({ k: "held", v: look.held, isDefault: look.held === DEFAULT_LOOK.held }, look.cls)) look.held = DEFAULT_LOOK.held; // อาวุธของคลาสเทอมก่อน: เก็บไว้ แต่ไม่ถือ
      return { ...d, look } as LootState;
    },
  });
}

export type TitleState = { current: string | null; have: Record<string, number> };
const titleKey = ["xp", "titles"] as const;

/** ฉายา (migration 7c) · ยังไม่รัน = data เป็น undefined → หน้าเกมโชว์ฉายาตั้งต้น ไม่มีปุ่มเปลี่ยน */
export function useTitles() {
  return useQuery({
    queryKey: titleKey,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("title_state");
      if (error) throw error;
      return data as TitleState;
    },
  });
}

/** เปลี่ยนฉายา (optimistic) */
export function useSetTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("set_title", { p_id: id });
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: titleKey });
      const prev = qc.getQueryData<TitleState>(titleKey);
      if (prev) qc.setQueryData<TitleState>(titleKey, { ...prev, current: id });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(titleKey, ctx.prev);
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

/** แลกเศษชอล์กเป็นของที่ยังไม่มี (migration 7b · craft_item) · รอผลจาก DB แล้วโหลดสถานะใหม่ */
export function useCraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc("craft_item", { p_item: itemId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: lootKey }),
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
