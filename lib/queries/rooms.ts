import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUserId, supabase } from "@/lib/supabase";
import { keys } from "@/lib/queries/core";

// ห้องร่วม (ขั้น 6) · สร้าง/เข้า/ออกห้องไม่ใช่การกดบ่อย → รอผลเซิร์ฟเวอร์

export type Room = { id: string; name: string; code: string; owner_id: string; members: number; isOwner: boolean };

const must = <T,>(r: { data: T | null; error: unknown }): T => {
  if (r.error) throw r.error;
  return r.data as T;
};

export const roomsKey = ["rooms"] as const;

export function useRooms() {
  return useQuery({
    queryKey: roomsKey,
    queryFn: async () => {
      const [uid, rows] = await Promise.all([
        currentUserId(),
        supabase.from("rooms").select("id,name,code,owner_id,room_members(count)").order("created_at").then(must),
      ]);
      return (rows as (Omit<Room, "members" | "isOwner"> & { room_members: { count: number }[] })[]).map(
        ({ room_members, ...r }) => ({ ...r, members: room_members[0]?.count ?? 0, isOwner: r.owner_id === uid }),
      );
    },
  });
}

/** หลังเข้า/ออก/ลบห้อง งานที่เห็นเปลี่ยน → โหลดงานใหม่ด้วย */
function useRoomMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: roomsKey });
      qc.invalidateQueries({ queryKey: keys.assignments });
    },
  });
}

export const useCreateRoom = () =>
  useRoomMutation(async (name: string) => must(await supabase.from("rooms").insert({ name }).select("id,code").single()));

export const useJoinRoom = () =>
  useRoomMutation(async (code: string) => {
    const { data, error } = await supabase.rpc("join_room", { p_code: code });
    if (error) throw error;
    return data as { id: string; name: string };
  });

/** เจ้าของ = ลบห้อง (งานในห้องหายทั้งหมด) · สมาชิก = ออกจากห้อง */
export const useLeaveRoom = () =>
  useRoomMutation(async (room: Room) => {
    if (room.isOwner) return must(await supabase.from("rooms").delete().eq("id", room.id).select("id"));
    const uid = await currentUserId();
    return must(await supabase.from("room_members").delete().eq("room_id", room.id).eq("user_id", uid).select("room_id"));
  });

/** ลิงก์ชวนเข้าห้อง (เว็บ = โดเมนที่เปิดอยู่) */
export const roomLink = (code: string) =>
  (typeof window !== "undefined" && window.location ? window.location.origin : "") + "/room/" + code;
