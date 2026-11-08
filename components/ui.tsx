import { useEffect, useState, type ReactNode } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { maskDate, maskTime } from "@/lib/input";
import { color, crtGlow, font, minTouch, radius, space } from "@/lib/theme";

// ชิ้นส่วนพื้นฐานที่ใช้ร่วมทุกหน้า (ธีม A สมุดเก่า · docs/DESIGN.md + docs/mockups/a-*.html)

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

// เทปหัวข้อ [สี, รอยเหนือเทป] เลือกเองให้หัวข้อติดกันไม่ซ้ำ · รอย: 0 ไม่มี 1 แก้ว 2 คลิปสนิม 3 ขีดนับปากกา
const TAPE_LOOK: Record<string, readonly [number, number]> = {
  "ต้องทำ": [0, 0], "ทวนวันนี้": [1, 1],
  "เทอมปัจจุบัน": [3, 0], "แจ้งเตือนบนเครื่องนี้": [0, 2], "การเข้าเรียน": [2, 0], "งานจากห้องเรียน": [1, 3], "ห้องร่วม (แชร์งานกับเพื่อน)": [0, 0], "บัญชี": [3, 1],
  "เทอมนี้": [3, 2],
  "เข้าเรียน": [2, 0], "วันสอบ": [0, 3], "คะแนน": [1, 0], "โน้ตแต่ละคาบ": [3, 2], "งานของวิชา": [0, 0],
  "สัปดาห์นี้": [0, 1], "ถัดไป": [1, 0], "ไม่มีกำหนดส่ง": [3, 3], "ส่งแล้ว": [2, 0],
  "หัวข้อที่เรียน": [1, 2], "มีงานสั่งไหม": [0, 0], "ตารางเรียน": [2, 1], "ลิงก์": [3, 0], "คาบชดเชย": [1, 3],
};
const TORN = Platform.OS === "web" ? ({ clipPath: "polygon(0 8%,2% 0,100% 0,100% 100%,3% 100%,0 88%,1.6% 66%,0 44%,1.8% 24%)" } as ViewStyle) : null;

/** ตัวเลขบนจอเขียวจิ๋ว ใช้กับตัวเลขและ % เท่านั้น (VT323 ไม่มีตัวไทย) */
export function Readout({ children }: { children: ReactNode }) {
  return <View style={s.readout}><Text style={s.readoutText}>{children}</Text></View>;
}

/** รอยปากกาแดงใต้งานที่เลยรอบ */
export function PenScribble() {
  if (Platform.OS !== "web") return null;
  return <svg width={108} height={6} viewBox="0 0 108 6" aria-hidden style={{ display: "block" }}><path d="M2 4c9-3 15 2 24 0s14-3 24 0 15 1 24-1 18 2 32 0" fill="none" stroke={color.red} strokeWidth={1.5} strokeLinecap="round" /></svg>;
}

/** รอยในช่องว่างเหนือเทป จึงไม่ทับตัวหนังสือ */
function GapMark({ kind, left }: { kind: number; left: `${number}%` }) {
  if (Platform.OS !== "web" || !kind) return null;
  return (
    <View pointerEvents="none" style={[s.gapMark, { left }]}>
      {kind === 1 && (
        <svg width={120} height={36} viewBox="0 0 96 28.8" fill="none" stroke={color.stain} aria-hidden>
          <path d="M48 6c24-.6 42 18 42 42S72 90.500 47 90 5.500 71 6 47 25 6.500 48 6Z" strokeWidth={1.4} strokeOpacity={0.34} strokeDasharray="118 7 92 4 36" />
          <path d="M48 10.500c21 0 37.500 16 37.500 37.500S69 85.500 47.500 85.500 10.500 69 10.500 47.500 27 10.500 48 10.500Z" strokeWidth={4.5} strokeOpacity={0.12} strokeDasharray="84 22 118 14" />
        </svg>
      )}
      {kind === 2 && (
        <svg width={66} height={26} viewBox="0 0 66 26" fill="none" stroke={color.stain} aria-hidden>
          <path transform="translate(66 0) rotate(90)" d="M19 12v40a7 7 0 0 1-14 0V14a5 5 0 0 1 10 0v35a2.500 2.500 0 0 1-5 0V19" strokeOpacity={0.5} strokeWidth={1.6} strokeLinecap="round" strokeDasharray="46 2 31 3 54 2" />
        </svg>
      )}
      {kind === 3 && (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color.red} aria-hidden>
          <path d="M5 4 3 21M12 3l-2 18M19 4l-2 16" strokeOpacity={0.45} strokeWidth={1.4} strokeLinecap="round" />
        </svg>
      )}
    </View>
  );
}

/** หัวข้อย่อยบนเทปขอบฉีก · count = ตัวเลขบนจอจิ๋ว · side = คำอธิบายใต้เทป */
export function Section({ children, side, count }: { children: ReactNode; side?: ReactNode; count?: { n: number; unit: string } }) {
  const title = String(children);
  const [tape, mark] = TAPE_LOOK[title] ?? [3, 0];
  return (
    <View style={s.section}>
      <GapMark kind={mark} left={`${8 + (title.length * 13) % 45}%`} />
      <View style={s.tapeClip}>
        <View style={[s.sectionTape, { backgroundColor: color.tape[tape] }, TORN]}>
          <Text style={s.tapeTitle} accessibilityRole="header">{children}</Text>
          {count && <><Readout>{count.n}</Readout><Text style={s.tapeUnit}>{count.unit}</Text></>}
        </View>
      </View>
      {side != null && <Text style={s.sectionSide}>{side}</Text>}
    </View>
  );
}

/** ป้ายพิมพ์นูน (จุดเดียวต่อจอ) */
export function Dymo({ children }: { children: ReactNode }) {
  return <Text style={s.dymo}>{children}</Text>;
}

/** ตรายาง (จุดเดียวต่อจอ) · tone = แดง (ด่วน/เกิน) หรือน้ำเงิน (สถานะดี) */
export function Stamp({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "pen" }) {
  const c = tone === "red" ? color.red : color.pen;
  return <Text style={[s.stamp, { color: c, borderColor: c }]}>{children}</Text>;
}

// shortcut: เส้นสแกนใช้ CSS ของเว็บ แอป native จะไม่มีเส้น ถ้าทำ native ค่อยเปลี่ยนเป็นรูป
const SCAN = {
  backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,0,0,0.28) 0 1px, transparent 1px 3px), radial-gradient(120% 110% at 50% 50%, transparent 58%, rgba(0,0,0,0.5) 100%)",
} as ViewStyle;

/** กะพริบติด-ดับทุก ms · ลดการเคลื่อนไหว = ติดนิ่ง */
function useBlink(ms: number, enabled = true) {
  const [reduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!enabled || reduced) return;
    const t = setInterval(() => setOn((v) => !v), ms);
    return () => clearInterval(t);
  }, [ms, enabled, reduced]);
  return on || !enabled || reduced;
}

/** ตัวเลขใหญ่บนจอเขียว (VT323 ห้ามมีคำไทย) · ตัวเลขนิ่ง กะพริบเฉพาะโคลอน */
export function CrtBig({ text }: { text: string }) {
  const [left, right] = text.split(":");
  const on = useBlink(500, right !== undefined);
  return <Text style={s.crtBig}>{left}{right !== undefined && <><Text style={{ opacity: on ? 1 : 0 }}>:</Text>{right}</>}</Text>;
}

/** ป้ายบรรทัดแรกบนจอเขียว "> ..." + เคอร์เซอร์กะพริบ */
export function CrtLabel({ children }: { children: string }) {
  const on = useBlink(550);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Text style={s.crtK}>{`> ${children}`}</Text>
      <View aria-hidden style={[s.cursor, { opacity: on ? 1 : 0 }]} />
    </View>
  );
}

/** จอเขียวเรื่องสำคัญ: ซ้ายบอกว่าเรื่องอะไร ขวาตัวเลขใหญ่ · children = ปุ่มใต้ข้อมูล · overlay = ภาพตอนกด */
export function CrtFocus({ label, title, detail, big, unit, children, overlay }: {
  label: string; title: string; detail: string; big: string; unit?: string; children?: ReactNode; overlay?: ReactNode;
}) {
  return (
    <Crt style={{ marginTop: 22, marginBottom: 4 }} overlay={overlay}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <CrtLabel>{label}</CrtLabel>
          <Text style={s.crtTitle}>{title}</Text>
          <Text style={s.crtK}>{detail}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <CrtBig text={big} />
          {!!unit && <Text style={s.crtK}>{unit}</Text>}
        </View>
      </View>
      {children}
    </Crt>
  );
}

/** แถบ "ยกเลิก" 3 วินาทีหลังติ๊กส่งงาน · onClose ต้องเป็นฟังก์ชันคงที่ (setState) ให้นับเวลาไม่เริ่มใหม่ */
export function UndoBar({ text, onUndo, onClose }: { text: string; onUndo: () => void; onClose: (v: null) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(null), 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <View style={s.toast} accessibilityLiveRegion="polite" role="status">
      <Text style={s.toastText} numberOfLines={2}>{text}</Text>
      <Pressable onPress={onUndo} style={s.toastBtn} accessibilityRole="button">
        <Text style={s.toastBtnText}>ยกเลิก</Text>
      </Pressable>
    </View>
  );
}

/** จอเขียวแปะเทป 2 มุม (จุดเดียวต่อจอ) · เส้นสแกนทับบนสุด ไม่รับการแตะ · overlay = ภาพตอนกด ซ่อนเนื้อหาแต่คงความสูงการ์ด */
export function Crt({ children, style, overlay }: { children: ReactNode; style?: StyleProp<ViewStyle>; overlay?: ReactNode }) {
  return (
    <View style={[{ marginHorizontal: -4 }, style]}>
      <View style={s.crt}>
        <View style={overlay ? { opacity: 0 } : undefined} pointerEvents={overlay ? "none" : undefined} aria-hidden={!!overlay}>{children}</View>
        {overlay}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, SCAN]} aria-hidden />
      </View>
      <View style={[s.tape, { left: -14, transform: [{ rotate: "-28deg" }] }]} />
      <View style={[s.tape, { right: -14, transform: [{ rotate: "26deg" }] }]} />
    </View>
  );
}

/** ✓ ปากกาน้ำเงิน (SVG เว็บ · native ใช้กล่องสีแทน) */
export function Tick() {
  if (Platform.OS !== "web") return <View style={{ width: 10, height: 10, backgroundColor: color.pen }} />;
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
      <path d="M4 13.5l5 5.5L20.5 5" fill="none" stroke={color.pen} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** เทปกาวแปะขอบบนแผ่นล่าง (จุดเดียวต่อจอ) */
export const Tape = () => <View pointerEvents="none" style={s.sheetTape} />;

/** ปุ่มเพิ่มของ (เส้นประ) */
export function AddBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.add, pressed && { opacity: 0.7 }]}>
      <Text style={s.addText}>{label}</Text>
    </Pressable>
  );
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
  backBtn: { minHeight: 52, minWidth: 96, marginLeft: -8, paddingHorizontal: 8, justifyContent: "center", alignSelf: "flex-start" },
  back: { fontFamily: font.bodyBold, fontSize: 18, color: color.paper },
});

export const T = StyleSheet.create({
  h3: { fontFamily: font.bodyBold, fontSize: 18, color: color.paper },
  body: { fontFamily: font.body, fontSize: 16, color: color.paper },
  muted: { fontFamily: font.body, fontSize: 15, color: color.muted },
});

const s = StyleSheet.create({
  card: {
    backgroundColor: color.deck, borderWidth: 1, borderColor: color.rule2, borderRadius: radius.lg,
    padding: space.md, marginBottom: space.md,
  },
  section: { marginTop: 34, marginBottom: 6 },
  gapMark: { position: "absolute", bottom: "100%" },
  // เทปชนขอบจอขวาพอดีระยะขอบหน้า (16) · ตัดส่วนเกินจากการเอียง กันเลื่อนแนวนอน
  tapeClip: { marginLeft: -6, marginRight: -16, paddingVertical: 2, overflow: "hidden" },
  sectionTape: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 46, paddingVertical: 4, paddingLeft: 20, paddingRight: 16, transform: [{ rotate: "-0.5deg" }] },
  tapeTitle: { flex: 1, fontFamily: font.title, fontSize: 23, lineHeight: 34, color: color.on },
  tapeUnit: { fontFamily: font.bodyMedium, fontSize: 15, color: color.on },
  readout: { minWidth: 38, paddingHorizontal: 8, alignItems: "center", backgroundColor: color.crt, borderWidth: 2, borderColor: "#15110D", borderRadius: 5 },
  readoutText: { fontFamily: font.num, fontSize: 24, lineHeight: 30, color: color.crtOn, ...crtGlow.title },
  sectionSide: { fontFamily: font.body, fontSize: 15, color: color.faint, marginTop: space.xs },
  dymo: {
    alignSelf: "flex-start", backgroundColor: "#1A1A1A", color: "#F2F2F2", fontFamily: font.typeBold, fontSize: 12, lineHeight: 14,
    paddingHorizontal: 8, paddingTop: 4, paddingBottom: 3, borderRadius: 2, overflow: "hidden",
    textShadowColor: "#000", textShadowOffset: { width: 0, height: -1 }, textShadowRadius: 0,
  },
  stamp: {
    alignSelf: "center", fontFamily: font.bodyBold, fontSize: 15, borderWidth: 2, borderRadius: 4,
    paddingHorizontal: 9, paddingVertical: 1, transform: [{ rotate: "-6deg" }], opacity: 0.92,
  },
  crt: {
    backgroundColor: color.crt, borderRadius: 14, padding: 14, overflow: "hidden",
    boxShadow: "inset 0 0 0 2px #0F2717, inset 0 0 28px rgba(0,0,0,0.85), 0 3px 0 #2B2117",
  },
  crtBig: { fontFamily: font.num, fontSize: 36, lineHeight: 36, color: "#B8FFC9", ...crtGlow.big },
  crtK: { fontFamily: font.body, fontSize: 15, color: color.crtDim, ...crtGlow.dim },
  crtTitle: { fontFamily: font.bodyBold, fontSize: 19, lineHeight: 26, color: color.crtOn, marginTop: 2, ...crtGlow.title },
  cursor: { width: 8, height: 14, backgroundColor: color.crtOn },
  toast: {
    position: "absolute", left: 12, right: 12, bottom: 12, maxWidth: 536, alignSelf: "center",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: radius.sm,
    backgroundColor: color.paper, paddingVertical: 6, paddingRight: 6, paddingLeft: 14,
  },
  toastText: { flex: 1, fontFamily: font.body, fontSize: 16, color: color.on },
  toastBtn: { minHeight: minTouch, paddingHorizontal: 14, justifyContent: "center" },
  toastBtnText: { fontFamily: font.bodyBold, fontSize: 16, color: color.go },
  tape: { position: "absolute", top: -10, width: 72, height: 22, backgroundColor: "rgba(232,221,186,0.82)" },
  sheetTape: {
    position: "absolute", top: -11, left: "50%", marginLeft: -37, width: 74, height: 22,
    backgroundColor: "rgba(232,221,186,0.85)", transform: [{ rotate: "-3deg" }],
  },
  add: {
    minHeight: minTouch, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.rule2, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", marginTop: space.md,
  },
  addText: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper },
  btn: {
    flex: 1, minHeight: minTouch, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.paper,
    alignItems: "center", justifyContent: "center", paddingHorizontal: space.sm,
  },
  // ปุ่มหลัก = หมึกเต็ม + เงาแข็ง 2px (กดแล้วจมลง เงาหาย)
  btnPri: { backgroundColor: color.paper, boxShadow: `2px 2px 0 ${color.rule2}` },
  btnPriDown: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: "none" },
  btnRed: { borderColor: color.danger },
  btnRedFill: { backgroundColor: color.danger },
  btnText: { fontFamily: font.bodyBold, fontSize: 16, color: color.paper },
  skeleton: { backgroundColor: "rgba(42,33,24,0.10)", borderRadius: radius.lg, marginBottom: space.md },
});

/** ช่องกรอกพร้อมป้ายชื่อ · error = ข้อความแดงใต้ช่อง */
export function Field({ label, error, style, ...input }: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={[{ flex: 1 }, style as StyleProp<ViewStyle>]}>
      <Text style={f.label}>{label}</Text>
      <TextInput placeholderTextColor={color.placeholder} accessibilityLabel={label} {...input}
        style={[f.input, !!error && { borderColor: color.danger }]} />
      {!!error && <Text style={f.error}>{error}</Text>}
    </View>
  );
}

type MaskedProps = TextInputProps & { label: string; error?: string | null; onChangeText: (v: string) => void };

/** ช่องวันที่ พ.ศ. · พิมพ์แค่ตัวเลข / มาเอง (แปลงเป็น ISO ด้วย fromThaiDate) */
export const DateField = ({ onChangeText, ...p }: MaskedProps) => (
  <Field placeholder="08/11/2569" maxLength={10} keyboardType="number-pad" {...p} onChangeText={(v) => onChangeText(maskDate(v))} />
);

/** ช่องเวลา · พิมพ์แค่ตัวเลข : มาเอง */
export const TimeField = ({ onChangeText, ...p }: MaskedProps) => (
  <Field maxLength={5} keyboardType="number-pad" {...p} onChangeText={(v) => onChangeText(maskTime(v))} />
);

/** ถามยืนยันก่อนทำสิ่งที่ย้อนไม่ได้ (เว็บใช้ confirm ของเบราว์เซอร์ เพราะ Alert ปุ่มเดียวบนเว็บ) */
export function confirmAction(message: string, onYes: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert("ยืนยัน", message, [{ text: "ยกเลิก", style: "cancel" }, { text: "ตกลง", style: "destructive", onPress: onYes }]);
}

const f = StyleSheet.create({
  label: { fontFamily: font.body, fontSize: 15, color: color.muted, marginTop: space.md, marginBottom: 6 },
  input: {
    minHeight: minTouch, borderWidth: 1.5, borderColor: color.rule2, borderRadius: radius.md, paddingHorizontal: space.md,
    fontFamily: font.body, fontSize: 16, color: color.paper, backgroundColor: color.field,
  },
  error: { fontFamily: font.body, fontSize: 15, color: color.danger, marginTop: 4 },
});
