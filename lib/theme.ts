// design tokens ที่เดียวของแอป — กติกาการใช้อยู่ใน docs/DESIGN.md (ธีม A สมุดเก่า + จอเขียวแปะเทป)

export const color = {
  // หน้าใช้งานธีม A "สมุดเก่า + จอเขียวแปะเทป" (mockup e2-terminal-notebook.html ฝั่ง A + a-*.html)
  ink: "#E9DDBF", // พื้นกระดาษ
  deck: "#F3EAD2", // กล่อง แผง แผ่นล่าง · ตัวหนังสือบนปุ่มหมึก
  field: "#FBF5E6", // ช่องกรอก
  rule: "rgba(60,90,140,0.30)", // เส้นบรรทัดฟ้าแบบสมุด
  rule2: "#8C7B60", // ขอบกล่อง/ช่องกรอก เส้นประ เงาแข็งปุ่มหลัก (เส้นเท่านั้น ไม่ใช่ตัวหนังสือ)
  paper: "#2A2118", // หมึกดำ: ตัวหนังสือหลัก ปุ่มหลัก แถบแท็บ
  muted: "#574735", // ข้อความรอง
  faint: "#64523F", // ข้อความประกอบ
  pen: "#2B4A8A", // ปากกาน้ำเงิน: ตัวเลือกที่เลือก ✓ ลิงก์
  red: "#A0281D", // ปากกาแดง: ★ ตรายางด่วน เส้นกั้นหน้า
  go: "#F2C94C", // เหลือง: บนพื้นหมึกเข้มเท่านั้น ห้ามเป็นตัวหนังสือบนพื้นอ่อน
  warn: "#8A3F08", // ใกล้ส่ง/ค้าง
  danger: "#A0281D",
  dangerBg: "rgba(160,40,29,0.08)", // พื้นกล่องเตือน (ตัวหนังสือ dangerInk)
  dangerInk: "#6E1A12",
  on: "#F3EAD2", // ตัวหนังสือบนพื้นหมึกเข้ม
  onMuted: "#CDBE9E",
  crt: "#08130C", // จอเขียว: พื้น
  crtOn: "#9EF0B4", // จอเขียว: ตัวหลัก
  crtDim: "#73C48B", // จอเขียว: ตัวรอง

  // ชื่อจากธีม B ที่หน้าเก่ายังใช้ — ย้ายไปชื่อข้างบนตอนแก้หน้านั้น (ขั้น 3–4) แล้วลบทิ้ง
  navy: "#2B4A8A",
  navyDeep: "#2A2118",
  navyRule: "#8C7B60",
  onNavy: "#F3EAD2",
  onNavyMuted: "#CDBE9E",
  onNavyFaint: "#CDBE9E",

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
  title: "Chonburi_400Regular", // หัวจอ หัวข้อย่อย (ไทย)
  body: "Anuphan_400Regular", // เนื้อหา
  bodyMedium: "Anuphan_500Medium",
  bodyBold: "Anuphan_600SemiBold", // ปุ่ม แท็บ ป้าย
  type: "CourierPrime_400Regular", // วันที่ ตัวเลขนอกจอ ป้ายพิมพ์ดีด
  typeBold: "CourierPrime_700Bold",
  num: "VT323_400Regular", // ตัวเลขบนจอเขียวเท่านั้น ห้ามใช้กับคำไทย
  pixel: "Silkscreen_400Regular", // หน้าเกม: คำอังกฤษสั้น LV XP HP
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
// มุมเหลี่ยมทั้งแอป (เทอร์มินัล) · pill เหลือไว้ให้จุดกลม
export const radius = { sm: 0, md: 0, lg: 0, pill: 999 } as const;
export const minTouch = 44;
