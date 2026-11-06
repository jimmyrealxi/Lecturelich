import type { ReactNode } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { color, font, minTouch, radius, space } from "@/lib/theme";

// ชิ้นส่วนพื้นฐานที่ใช้ร่วมทุกหน้า (หน้าตาตาม docs/mockups/stage0.html)

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({ children }: { children: ReactNode }) {
  return <Text style={s.section}>{children}</Text>;
}

export function Btn({
  label, onPress, kind = "plain", selected = false, style,
}: {
  label: string;
  onPress: () => void;
  kind?: "plain" | "primary";
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const filled = kind === "primary" || selected;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [s.btn, filled && s.btnFilled, pressed && { opacity: 0.8 }, style]}
    >
      <Text style={[s.btnText, filled && s.btnTextFilled]}>{label}</Text>
    </Pressable>
  );
}

/** กล่องเทาแทนวงกลมหมุนระหว่างโหลด */
export function Skeleton({ height = 72 }: { height?: number }) {
  return <View style={[s.skeleton, { height }]} />;
}

export const T = StyleSheet.create({
  h3: { fontFamily: font.heading, fontSize: 16, color: color.ink },
  body: { fontFamily: font.body, fontSize: 14, color: color.ink },
  muted: { fontFamily: font.body, fontSize: 13, color: color.sub },
});

const s = StyleSheet.create({
  card: {
    backgroundColor: color.white, borderWidth: 1, borderColor: color.line, borderRadius: radius.lg,
    padding: space.md, marginBottom: space.md,
  },
  section: { fontFamily: font.heading, fontSize: 14, color: color.sub, marginTop: space.md, marginBottom: space.sm },
  btn: {
    flex: 1, minHeight: minTouch, borderRadius: radius.md, borderWidth: 1, borderColor: color.line,
    backgroundColor: color.white, alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm,
  },
  btnFilled: { backgroundColor: color.blue, borderColor: color.blue },
  btnText: { fontFamily: font.body, fontSize: 14, color: color.ink },
  btnTextFilled: { color: color.white, fontFamily: font.bodyBold },
  skeleton: { backgroundColor: color.line, borderRadius: radius.lg, marginBottom: space.md, opacity: 0.6 },
});

/** ช่องกรอกพร้อมป้ายชื่อ · error = ข้อความแดงใต้ช่อง */
export function Field({ label, error, style, ...input }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={[{ flex: 1 }, style as StyleProp<ViewStyle>]}>
      <Text style={f.label}>{label}</Text>
      <TextInput placeholderTextColor={color.sub} accessibilityLabel={label} {...input}
        style={[f.input, !!error && { borderColor: color.danger }]} />
      {!!error && <Text style={f.error}>{error}</Text>}
    </View>
  );
}

/** ถามยืนยันก่อนทำสิ่งที่ย้อนไม่ได้ (เว็บใช้ confirm ของเบราว์เซอร์ เพราะ Alert ปุ่มเดียวบนเว็บ) */
export function confirmAction(message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert("ยืนยัน", message, [{ text: "ยกเลิก", style: "cancel" }, { text: "ตกลง", style: "destructive", onPress: onYes }]);
}

const f = StyleSheet.create({
  label: { fontFamily: font.body, fontSize: 13, color: color.sub, marginTop: space.md, marginBottom: 6 },
  input: {
    minHeight: minTouch, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, paddingHorizontal: space.md,
    fontFamily: font.body, fontSize: 16, color: color.ink, backgroundColor: color.white,
  },
  error: { fontFamily: font.body, fontSize: 12, color: color.danger, marginTop: 4 },
});
