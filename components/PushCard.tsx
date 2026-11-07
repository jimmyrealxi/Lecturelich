import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Btn, Card, T } from "@/components/ui";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/web/webPush";
import { color, font, radius, space } from "@/lib/theme";

/** การ์ดเปิด/ปิดแจ้งเตือนบนเครื่องนี้ · ขออนุญาตจากการกดปุ่มเท่านั้น (iPhone บังคับ) */
export function PushCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  const run = async (fn: () => Promise<string | null | void>) => {
    setBusy(true);
    setError((await fn()) || null);
    setState(await getPushState());
    setBusy(false);
  };

  if (state === null || state === "unsupported") {
    return state === null ? null : (
      <Card><Text style={T.muted}>อุปกรณ์หรือเบราว์เซอร์นี้รับแจ้งเตือนไม่ได้ (ลองเปิดผ่าน Chrome หรือติดตั้งแอปก่อน)</Text></Card>
    );
  }

  if (state === "ios-install") {
    return (
      <Card style={s.warn}>
        <Text style={T.h3}>iPhone ต้องติดตั้งแอปก่อน</Text>
        <Text style={T.muted}>Safari รับแจ้งเตือนได้เฉพาะแอปที่เพิ่มไปยังหน้าจอโฮมแล้ว</Text>
        <View style={s.row}><Btn kind="primary" label="ดูวิธีติดตั้ง" onPress={() => router.push("/install")} /></View>
      </Card>
    );
  }

  return (
    <Card>
      <View style={s.between}>
        <Text style={T.h3}>รับแจ้งเตือน</Text>
        {state === "on" && <Text style={s.ok}>เปิดอยู่</Text>}
      </View>
      <Text style={T.muted}>
        {state === "denied"
          ? "เคยกดไม่อนุญาตไว้ — เปิดคืนได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์"
          : "เตือนให้จดหลังเลิกคาบ และเตือนก่อนถึงกำหนดส่งงาน"}
      </Text>
      {state !== "denied" && (
        <View style={s.row}>
          {state === "on"
            ? <Btn label={busy ? "กำลังปิด…" : "ปิดบนเครื่องนี้"} onPress={() => !busy && run(disablePush)} />
            : <Btn kind="primary" label={busy ? "กำลังเปิด…" : "เปิดการแจ้งเตือน"} onPress={() => !busy && run(enablePush)} />}
        </View>
      )}
      {error && <Text style={s.error}>{error}</Text>}
    </Card>
  );
}

const s = StyleSheet.create({
  warn: { backgroundColor: color.deck, borderColor: color.paper, borderStyle: "dashed", borderWidth: 1.5 },
  row: { flexDirection: "row", marginTop: space.md },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  // ตรายางน้ำเงิน "เปิดอยู่" (จุดเดียวของหน้าตั้งค่า)
  ok: {
    fontFamily: font.bodyBold, fontSize: 13, color: color.pen, borderWidth: 2, borderColor: color.pen, borderRadius: 4,
    paddingHorizontal: 9, paddingVertical: 1, transform: [{ rotate: "-6deg" }], opacity: 0.92,
  },
  error: { fontFamily: font.body, fontSize: 13, color: color.danger, marginTop: space.sm },
});
