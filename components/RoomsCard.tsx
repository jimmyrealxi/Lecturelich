import { useState } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";
import { Btn, Card, Field, Skeleton, T, confirmAction } from "@/components/ui";
import { roomLink, useCreateRoom, useJoinRoom, useLeaveRoom, useRooms, type Room } from "@/lib/queries/rooms";
import { normRoomCode } from "@/lib/rooms";
import { color, font, space } from "@/lib/theme";

// ห้องร่วมในหน้าตั้งค่า: รายการห้อง · ชวนเพื่อน · สร้างห้อง · เข้าห้องด้วยโค้ด (mockup docs/mockups/stage6.html)

async function shareRoom(r: Room) {
  const url = roomLink(r.code);
  const message = `เข้าห้อง "${r.name}" ใน StudyQuest: ${url} (โค้ด ${r.code})`;
  if (Platform.OS !== "web") return Share.share({ message });
  if (navigator.share) return navigator.share({ text: message }).catch(() => {});
  await navigator.clipboard?.writeText(message);
  window.alert("คัดลอกลิงก์ชวนแล้ว");
}

export function RoomsCard() {
  const rooms = useRooms();
  const create = useCreateRoom();
  const join = useJoinRoom();
  const leave = useLeaveRoom();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [tried, setTried] = useState<"create" | "join" | null>(null);
  const norm = normRoomCode(code);

  if (rooms.isPending) return <Skeleton height={120} />;

  return (
    <>
      {(rooms.data ?? []).map((r) => (
        <Card key={r.id}>
          <View style={s.between}>
            <Text style={[T.h3, { flex: 1 }]} numberOfLines={1}>{r.name}</Text>
            <Text style={s.code}>{r.code}</Text>
          </View>
          <Text style={T.muted}>สมาชิก {r.members} คน{r.isOwner ? " · คุณเป็นเจ้าของห้อง" : ""}</Text>
          <View style={[s.row, { marginTop: space.sm }]}>
            <Btn label={r.isOwner ? "ลบห้อง" : "ออกจากห้อง"} onPress={() =>
              confirmAction(r.isOwner ? `ลบห้อง "${r.name}"? งานในห้องจะหายจากทุกคน` : `ออกจากห้อง "${r.name}"? งานของห้องจะหายจากรายการของคุณ`,
                () => leave.mutate(r))} />
            <Btn kind="primary" label="ชวนเพื่อน" onPress={() => void shareRoom(r)} />
          </View>
        </Card>
      ))}
      {rooms.data?.length === 0 && (
        <Text style={[T.muted, { marginBottom: space.sm }]}>ห้องร่วมใช้แชร์ &quot;งานและกำหนดส่ง&quot; กับเพื่อนเท่านั้น โน้ต คะแนน และสถานะส่งยังเป็นของคุณคนเดียว</Text>
      )}

      <Card>
        <View style={s.row}>
          <Field label="สร้างห้องใหม่" value={name} onChangeText={setName} placeholder="IT ปี 1 กลุ่ม 2" maxLength={60}
            error={tried === "create" && !name.trim() ? "ใส่ชื่อห้อง" : null} />
        </View>
        <View style={[s.row, { marginTop: space.sm }]}>
          <Btn label={create.isPending ? "กำลังสร้าง…" : "สร้างห้อง"} onPress={() => {
            setTried("create");
            if (!name.trim() || create.isPending) return;
            create.mutate(name.trim(), { onSuccess: () => { setName(""); setTried(null); } });
          }} />
        </View>
        <Field label="หรือเข้าห้องด้วยโค้ด" value={code} onChangeText={setCode} placeholder="ABCD2345" autoCapitalize="characters"
          maxLength={10} error={tried === "join" && !norm ? "โค้ด 8 ตัว" : join.isError ? "ไม่พบห้องนี้" : null} />
        <View style={[s.row, { marginTop: space.sm }]}>
          <Btn label={join.isPending ? "กำลังเข้า…" : "เข้าห้อง"} onPress={() => {
            setTried("join");
            if (!norm || join.isPending) return;
            join.mutate(norm, { onSuccess: () => { setCode(""); setTried(null); } });
          }} />
        </View>
        {create.isError && <Text style={s.err}>สร้างห้องไม่สำเร็จ ลองอีกครั้ง</Text>}
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  code: { fontFamily: font.pixel, fontSize: 14, color: color.navy, letterSpacing: 1 },
  err: { fontFamily: font.body, fontSize: 13, color: color.danger, marginTop: space.sm },
});
