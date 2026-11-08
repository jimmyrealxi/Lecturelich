import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { signInWithGoogle, useSession } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import { color, font, minTouch, radius, space } from "@/lib/theme";

export default function Login() {
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  if (session) return <Redirect href="/today" />;

  const onPress = () => signInWithGoogle().catch((e: Error) => setError(e.message));

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Lecturelich</Text>
      <Text style={s.sub}>ผู้ช่วยเรียนส่วนตัว · ตาราง งาน โน้ต และทวนสอบแบบเกม</Text>
      <View style={s.stroke} />
      {supabaseConfigured ? (
        <Pressable style={s.btn} onPress={onPress} accessibilityRole="button">
          <Text style={s.btnText}>เข้าสู่ระบบด้วย Google</Text>
        </Pressable>
      ) : (
        <Text style={s.error}>ยังไม่ได้ตั้งค่า Supabase (สร้างไฟล์ .env ตาม .env.example)</Text>
      )}
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: space.xl, width: "100%", maxWidth: 420, alignSelf: "center" },
  title: { fontFamily: font.title, fontSize: 40, lineHeight: 52, color: color.paper },
  sub: { fontFamily: font.body, fontSize: 15, color: color.muted, marginTop: space.sm },
  // ขีดหมึกแดงใต้ชื่อ (mockup a-settings จอ 5)
  stroke: { width: 72, height: 2, backgroundColor: color.red, marginTop: 18, transform: [{ rotate: "-1.5deg" }] },
  btn: {
    marginTop: 18, minHeight: minTouch, paddingHorizontal: space.xl, borderRadius: radius.md,
    backgroundColor: color.paper, alignItems: "center", justifyContent: "center", alignSelf: "stretch",
    boxShadow: `2px 2px 0 ${color.rule2}`,
  },
  btnText: { fontFamily: font.bodyBold, fontSize: 16, color: color.deck },
  error: { fontFamily: font.body, fontSize: 15, color: color.danger, marginTop: space.lg },
});
