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
      <Text style={s.title}>StudyQuest</Text>
      <Text style={s.sub}>ผู้ช่วยเรียนส่วนตัว · ตาราง งาน โน้ต และทวนสอบแบบเกม</Text>
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
  wrap: { flex: 1, backgroundColor: color.ink, alignItems: "center", justifyContent: "center", padding: space.xl },
  title: { fontFamily: font.bodyBold, fontSize: 32, color: color.navy },
  sub: { fontFamily: font.body, fontSize: 14, color: color.muted, marginTop: space.sm, textAlign: "center" },
  btn: {
    marginTop: space.xl, minHeight: minTouch, paddingHorizontal: space.xl, borderRadius: radius.md,
    backgroundColor: color.go, alignItems: "center", justifyContent: "center", alignSelf: "stretch", maxWidth: 360,
  },
  btnText: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper },
  error: { fontFamily: font.body, fontSize: 14, color: color.danger, marginTop: space.lg, textAlign: "center" },
});
