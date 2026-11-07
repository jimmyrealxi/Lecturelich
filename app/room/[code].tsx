import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Btn, Card, T } from "@/components/ui";
import { signInWithGoogle, useSession } from "@/lib/auth";
import { useJoinRoom } from "@/lib/queries/rooms";
import { normRoomCode } from "@/lib/rooms";
import { color, font, space } from "@/lib/theme";

// เข้าห้องร่วมจากลิงก์ชวน /room/CODE · ยังไม่ล็อกอิน = ล็อกอินแล้วกลับมาหน้านี้
export default function JoinRoom() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = normRoomCode(raw ?? "");
  const session = useSession();
  const join = useJoinRoom();

  return (
    <View style={s.wrap}>
      <Card style={s.card}>
        <Text style={T.h3}>เข้าห้องร่วม</Text>
        <Text style={s.code}>{code ?? "โค้ดไม่ถูกต้อง"}</Text>
        <Text style={T.muted}>ในห้องจะเห็น &quot;งานและกำหนดส่ง&quot; ร่วมกัน · โน้ต คะแนน เช็กชื่อ และสถานะส่งงานยังเป็นของคุณคนเดียว</Text>
        {join.isError && <Text style={s.err}>ไม่พบห้องนี้ หรือเข้าไม่สำเร็จ</Text>}
        {join.isSuccess && <Text style={[T.body, { marginTop: space.sm }]}>เข้าห้อง &quot;{join.data.name}&quot; แล้ว ✓</Text>}
        <View style={s.row}>
          {session === undefined ? null : !session ? (
            <Btn kind="primary" label="เข้าสู่ระบบด้วย Google" onPress={() => void signInWithGoogle("/room/" + (code ?? ""))} />
          ) : join.isSuccess ? (
            <Btn kind="primary" label="ไปที่งาน" onPress={() => router.replace("/tasks")} />
          ) : (
            <>
              <Btn label="ไม่เข้า" onPress={() => router.replace("/today")} />
              <Btn kind="primary" label={join.isPending ? "กำลังเข้า…" : "เข้าห้องนี้"}
                onPress={() => code && !join.isPending && join.mutate(code)} />
            </>
          )}
        </View>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: color.ink, justifyContent: "center", padding: space.lg },
  card: { width: "100%", maxWidth: 420, alignSelf: "center" },
  code: { fontFamily: font.pixel, fontSize: 24, color: color.navy, marginVertical: space.sm, letterSpacing: 2 },
  row: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  err: { fontFamily: font.body, fontSize: 13, color: color.danger, marginTop: space.sm },
});
