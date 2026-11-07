// design tokens ที่เดียวของแอป — กติกาการใช้อยู่ใน docs/DESIGN.md · mockup docs/mockups/retro-theme.html

export const color = {
  // หน้าใช้งาน "สมุดเทอร์มินัล" (กราไฟต์อุ่น)
  ink: "#121513", // พื้นหลังหน้า
  deck: "#181C19", // แผง/การ์ด แถบแท็บ · ตัวหนังสือบนพื้น go/warn
  rule: "#2B322D", // เส้นแบ่ง
  rule2: "#3A433C", // ขอบปุ่ม ช่องว่างของแถบ
  paper: "#E2E7DF", // ตัวหนังสือหลัก
  muted: "#A2ADA4", // ข้อความรอง
  faint: "#8A968D", // ข้อความประกอบ ป้ายแท็บที่ไม่ได้เลือก
  go: "#86D99B", // สีหลัก: กำลังเรียน ปุ่มที่เลือก ขีดแท็บ
  warn: "#F0B35A", // สีเน้น: ค้าง/ใกล้ส่ง LV
  danger: "#F07167",
  dangerBg: "#2A1715",

  // หน้าเกม "อีกโลก" (หิน ทองหม่น)
  cave: "#0F0D0C",
  gameDeep: "#060504", // ช่องแถบ XP/HP
  gamePanel: "#1A1613",
  seam: "#3B3027", // เส้นแบ่ง
  bone: "#E8DFD0", // ตัวหนังสือ
  ash: "#B0A28E", // ข้อความรอง
  gold: "#C9A25B", // จุดเด่น
  blood: "#C2372C", // เลือดบอส
  bossLine: "#5A1E18",
} as const;

// สีความหายาก (รางวัล ความสำเร็จ หัวข้อที่ทวนครบรอบ)
export const rarity = {
  normal: "#E8E8E8",
  magic: "#8AB0FF",
  rare: "#F2C230",
  unique: "#EE8A3C",
} as const;

export const font = {
  heading: "ChakraPetch_600SemiBold", // หัวข้อ ปุ่ม แท็บ
  headingBold: "ChakraPetch_700Bold",
  body: "IBMPlexSansThai_400Regular",
  bodyMedium: "IBMPlexSansThai_500Medium",
  bodyBold: "IBMPlexSansThai_600SemiBold",
  num: "VT323_400Regular", // ตัวเลข/เวลาเท่านั้น ห้ามใช้กับคำไทย
  pixel: "Silkscreen_400Regular", // เฉพาะคำอังกฤษสั้น เช่น LV XP HP
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
// มุมเหลี่ยมทั้งแอป (เทอร์มินัล) · pill เหลือไว้ให้จุดกลม
export const radius = { sm: 0, md: 0, lg: 0, pill: 999 } as const;
export const minTouch = 44;
