// design tokens ที่เดียวของแอป — กติกาการใช้อยู่ใน docs/DESIGN.md

export const color = {
  // หน้าใช้งาน (สว่าง)
  blue: "#1F4E9C", // แถบบน ปุ่มหลัก
  ink: "#0E1E3A", // ตัวหนังสือ
  yellow: "#F2C230", // สีเน้นเท่านั้น ~10% · ห้ามเป็นตัวหนังสือบนพื้นขาว
  line: "#D9DCE1", // การ์ด เส้นแบ่ง
  cream: "#F4F1E8", // พื้นหลัง
  sub: "#3D4A63", // ข้อความรอง
  white: "#FFFFFF",
  danger: "#B3261E",
  dangerBg: "#FBE9E7",

  // หน้าเกม (มืด)
  gameBg: "#0E1E3A",
  gameDeep: "#0A1630", // ช่องแถบ XP / กรอบตัวละคร
  gamePanel: "#16294A",
  gameLine: "#2A3F66",
  gameText: "#E9EDF5",
  gameSub: "#AFB9CC",
  brass: "#C9A24A",
  hp: "#C0392B",
  bossLine: "#6B2A2A", // กรอบบอส + ป้าย D-day
} as const;

// สีความหายาก (รางวัล ความสำเร็จ หัวข้อที่ทวนครบรอบ)
export const rarity = {
  normal: "#E8E8E8",
  magic: "#7FA8FF",
  rare: "#F2C230",
  unique: "#EE8A3C",
} as const;

export const font = {
  heading: "Kanit_600SemiBold",
  body: "IBMPlexSansThai_400Regular",
  bodyBold: "IBMPlexSansThai_600SemiBold",
  pixel: "Silkscreen_400Regular", // เฉพาะตัวเลข/คำอังกฤษ เช่น LV XP HP
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 10, lg: 14, pill: 999 } as const;
export const minTouch = 44;
