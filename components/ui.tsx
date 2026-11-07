import type { ReactNode } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { color, font, minTouch, radius, space } from "@/lib/theme";

// ชิ้นส่วนพื้นฐานที่ใช้ร่วมทุกหน้า (ธีม A สมุดเก่า · docs/DESIGN.md + docs/mockups/a-*.html)

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
  kind?: "plain" | "primary" | "danger" | "dangerFill";
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const red = kind === "danger" || kind === "dangerFill";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [s.btn, kind === "primary" && s.btnPri, selected && pick.on, red && s.btnRed, kind === "dangerFill" && s.btnRedFill,
        pressed && (kind === "primary" ? s.btnPriDown : { opacity: 0.8 }), style]}
    >
      <Text style={[s.btnText, kind === "primary" && { color: color.deck }, selected && pick.onText, red && { color: color.danger },
        kind === "dangerFill" && { color: color.on }]}>{label}</Text>
    </Pressable>
  );
}

/** กล่องเทาแทนวงกลมหมุนระหว่างโหลด */
export function Skeleton({ height = 72 }: { height?: number }) {
  return <View style={[s.skeleton, { height }]} />;
}

/** ตัวเลือกที่เลือก = วงปากกาน้ำเงิน (ทึบหมึกเฉพาะปุ่มหลัก/แท็บสลับ) */
export const pick = StyleSheet.create({
  on: { backgroundColor: "rgba(43,74,138,0.12)", borderColor: color.pen, borderWidth: 2 },
  onText: { color: color.pen, fontFamily: font.bodyBold },
});

/** หัวหน้าย่อย (หน้าใน Stack): หัว Chonburi + เส้นคู่ใต้หัวแบบสมุดบัญชี */
export const head = StyleSheet.create({
  top: {
    paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md,
    borderBottomWidth: 3, borderBottomColor: "rgba(42,33,24,0.75)", borderStyle: "double" as "solid",
  },
  title: { fontFamily: font.title, fontSize: 26, lineHeight: 34, color: color.paper },
  back: { fontFamily: font.bodyMedium, fontSize: 15, color: color.paper },
});

export const T = StyleSheet.create({
  h3: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper },
  body: { fontFamily: font.body, fontSize: 14, color: color.paper },
  muted: { fontFamily: font.body, fontSize: 13, color: color.muted },
});

const s = StyleSheet.create({
  card: {
    backgroundColor: color.deck, borderWidth: 1, borderColor: color.rule2, borderRadius: radius.lg,
    padding: space.md, marginBottom: space.md,
  },
  section: { fontFamily: font.title, fontSize: 18, lineHeight: 26, color: color.paper, marginTop: space.lg, marginBottom: space.sm },
  btn: {
    flex: 1, minHeight: minTouch, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.paper,
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm,
  },
  // ปุ่มหลัก = หมึกเต็ม + เงาแข็ง 2px (กดแล้วจมลง เงาหาย)
  btnPri: { backgroundColor: color.paper, boxShadow: `2px 2px 0 ${color.rule2}` },
  btnPriDown: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: "none" },
  btnRed: { borderColor: color.danger },
  btnRedFill: { backgroundColor: color.danger },
  btnText: { fontFamily: font.bodyBold, fontSize: 14, color: color.paper },
  skeleton: { backgroundColor: "rgba(42,33,24,0.10)", borderRadius: radius.lg, marginBottom: space.md },
});

/** ช่องกรอกพร้อมป้ายชื่อ · error = ข้อความแดงใต้ช่อง */
export function Field({ label, error, style, ...input }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={[{ flex: 1 }, style as StyleProp<ViewStyle>]}>
      <Text style={f.label}>{label}</Text>
      <TextInput placeholderTextColor={color.faint} accessibilityLabel={label} {...input}
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
  label: { fontFamily: font.body, fontSize: 13, color: color.muted, marginTop: space.md, marginBottom: 6 },
  input: {
    minHeight: minTouch, borderWidth: 1.5, borderColor: color.rule2, borderRadius: radius.md, paddingHorizontal: space.md,
    fontFamily: font.body, fontSize: 16, color: color.paper, backgroundColor: color.field,
  },
  error: { fontFamily: font.body, fontSize: 12, color: color.danger, marginTop: 4 },
});
