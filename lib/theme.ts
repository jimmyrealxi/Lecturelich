// design tokens ที่เดียวของแอป — กติกาการใช้อยู่ใน docs/DESIGN.md · mockup docs/mockups/retro-theme.html

export const color = {
  // หน้าใช้งาน "สมุดเทอร์มินัล" โทนยูนิฟอร์ม: พื้นเทาอ่อน + แผงน้ำเงิน + ขีดเหลือง (mockup retro-theme-blue.html แบบ B)
  ink: "#E6E9EE", // พื้นหลังหน้า
  deck: "#F3F5F8", // การ์ด ช่องกรอก แผ่นล่าง
  rule: "#C7CDD6", // เส้นแบ่งบาง
  rule2: "#B5BDC9", // ขอบปุ่ม ช่องว่างของแถบ
  paper: "#14213A", // ตัวหนังสือหลัก · ตัวหนังสือบนพื้นเหลือง
  muted: "#4A5873", // ข้อความรอง
  faint: "#5C6982", // ข้อความประกอบ
  go: "#F2C230", // เหลือง: เป็นพื้นหรือบนน้ำเงินเท่านั้น ห้ามเป็นตัวหนังสือบนพื้นอ่อน
  warn: "#A84B0C", // ส้มเข้ม: ค้าง/ใกล้ส่ง (ตัวหนังสือบนพื้นอ่อนได้)
  danger: "#B3261E",
  dangerBg: "#FBE9E7",
  navy: "#1E3D74", // แผงเด่น แถบแท็บ ปุ่มติ๊ก
  navyDeep: "#173162", // หัวหน้า
  navyRule: "#34558F", // เส้น/ช่องว่างบนแผงน้ำเงิน
  onNavy: "#F4F6FA", // ตัวหนังสือบนน้ำเงิน
  onNavyMuted: "#C2CDE0",
  onNavyFaint: "#A9B8D2",

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
