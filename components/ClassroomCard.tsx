import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Btn, Card, confirmAction, Skeleton, T } from "@/components/ui";
import { connectClassroom, syncLabel, useClassroomAccount, useClassroomCourses, useDisconnectClassroom } from "@/lib/queries/classroom";
import { useNow } from "@/lib/useNow";
import { color, font, radius, space } from "@/lib/theme";

/** การ์ดเชื่อม Google Classroom ในตั้งค่า (docs/mockups/a-classroom-connect.html จอ 1 และ 4) */
export function ClassroomCard() {
  const account = useClassroomAccount();
  const courses = useClassroomCourses();
  const disconnect = useDisconnectClassroom();
  const today = useNow().date;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      await connectClassroom(); // สำเร็จ = ออกจากหน้านี้ไป Google
    } catch {
      setError("เปิดหน้าอนุญาตของ Google ไม่ได้ ลองใหม่อีกครั้ง");
      setBusy(false);
    }
  };

  if (account.isPending) return <Skeleton />;
  const a = account.data;
  const count = (courses.data ?? []).filter((c) => c.enabled).length;
  const expired = a?.last_error === "expired";
  return (
    <Card>
      <Text style={T.h3}>Google Classroom</Text>
      {!a ? (
        <>
          <Text style={T.muted}>ดึงชื่องาน วันส่ง คำอธิบาย และลิงก์เข้าแท็บงานให้เอง แอปอ่านอย่างเดียว</Text>
          <View style={s.row}><Btn kind="primary" label={busy ? "กำลังเปิด..." : "เชื่อม Classroom"} onPress={connect} /></View>
        </>
      ) : (
        <>
          <Text style={T.muted}>เชื่อมแล้ว · ดึง {count} ห้อง · {a.last_sync_at ? `ล่าสุด ${syncLabel(a.last_sync_at, today)}` : "ยังไม่ได้ดึง"}</Text>
          {expired && <Text style={s.warn}>สิทธิ์เชื่อมหมดอายุ แอปเลยดึงงานใหม่ไม่ได้ กดเชื่อมใหม่เพื่อดึงต่อ</Text>}
          {a.last_error === "failed" && <Text style={s.warn}>ดึงงานรอบล่าสุดไม่สำเร็จ แอปจะลองใหม่ในรอบถัดไป</Text>}
          {expired && <View style={s.row}><Btn kind="primary" label={busy ? "กำลังเปิด..." : "เชื่อมใหม่"} onPress={connect} /></View>}
          <View style={s.row}>
            <Btn label="เลือกห้อง" onPress={() => router.push("/classroom")} />
            <Btn kind="danger" label="เลิกเชื่อม" onPress={() => confirmAction("เลิกเชื่อม Classroom? งานที่ดึงมาแล้วจะยังอยู่", () => disconnect.mutate())} />
          </View>
        </>
      )}
      {!!error && <Text style={s.err}>{error}</Text>}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  warn: { fontFamily: font.body, fontSize: 14, color: color.dangerInk, backgroundColor: color.dangerBg, borderRadius: radius.md, padding: space.md, marginTop: space.md },
  err: { fontFamily: font.body, fontSize: 14, color: color.danger, marginTop: space.sm },
});
