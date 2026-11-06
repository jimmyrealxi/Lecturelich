# 📚 StudyQuest (PWA ผู้ช่วยเรียน + ระบบเกม)

> ไฟล์นี้โหลดทุก session — เก็บให้สั้น · แผนเต็มอยู่ `docs/PLAN.md` · กติกาดีไซน์ `docs/DESIGN.md`

## หลัก
- **Stack**: Expo SDK 58 + expo-router + TypeScript (PWA เว็บเป็นหลัก, Vercel) · Supabase สิงคโปร์ (Auth Google / Postgres / Storage / Edge Functions / pg_cron) · TanStack Query + แคชลงเครื่อง
- **ข้อมูลส่วนตัวเป็นค่าเริ่มต้น** แชร์ได้แค่ `assignments` ในห้องร่วม (สถานะส่ง/คะแนน = ส่วนตัว)
- เวลาอิง `Asia/Bangkok` · UI ภาษาไทยทั้งหมด
- logic สำคัญ (คาบวันนี้ เกรด XP รอบทวน) อยู่ใน `lib/*.ts` แยกจาก UI + มีเทสต์
- ค่า XP อยู่ที่ config เดียว ห้ามฝังหลายจุด · XP/เลเวล/เลือดบอส/คะแนนรวม คำนวณใน DB (view/RPC)
- ระบบเกม: ยืมแค่บรรยากาศ ห้ามใช้ภาพ/ไอคอน/ชื่อ/ฟอนต์/โลโก้ของ Fallout หรือ Path of Exile · ห้าม XP เพราะเปิดแอป · ห้าม streak รีเซ็ต
- Push ยืมแพตเทิร์น LabHub: `push_subscriptions` + `notifications` → trigger (pg_net) → Edge Function `send-push` (VAPID)

## กติกาสั้นที่ต้องจำเสมอ
- Optimistic UI กับการกดที่ใช้บ่อย · แคชก่อนแล้วอัปเดต · skeleton แทนวงกลมหมุน · แอนิเมชันใช้ `transform`/`opacity` เท่านั้น
- ปุ่มสูง ≥ 44px · คอนทราสต์ ≥ 4.5:1 · จอ 360px ขึ้นไป · ห้ามตัวหนังสือเหลืองบนพื้นขาว
- migration ใหม่ต้องมี RLS policy ในไฟล์เดียวกัน · **เจ้าของรันเองใน Supabase SQL Editor**
- รูปย่อฝั่งเครื่องก่อนอัปโหลด

## วิธีทำงานกับเจ้าของ
- ตอบภาษาไทยเสมอ สั้น ประหยัด token · ทำช้าแต่รอบคอบ เช็ก edge case เองก่อนส่ง
- งาน UI: **ทำ mockup HTML ให้ดูก่อน** (`docs/mockups/`) อนุมัติแล้วค่อยเขียนโค้ด
- **ไม่ commit/push เองถ้าไม่สั่ง** — เจ้าของ commit ผ่าน GitHub Desktop → ให้ Summary (บรรทัดเดียว) + Description (bullet) ภาษาไทย
- ห้าม commit ลง main ทำงานบน branch · ไม่เปิดเบราว์เซอร์/dev server ถ้าไม่สั่ง
- repo `parnppk/StudyQuest` (private) · **เปิด PR เข้า main ครั้งเดียวต่อขั้น** หลังเจ้าของทดสอบขั้นนั้นผ่านทีละอย่างแล้วเท่านั้น
- **ทำทีละขั้นตาม `docs/PLAN.md` ข้อ 8** จบขั้นแล้วหยุดรอเจ้าของทดสอบ/อนุมัติ · ข้อมูลไม่พอให้ถามก่อนเดา

## จดงานทุกครั้ง
หลังทำงานเสร็จ อัปเดต "สถานะล่าสุด" ด้านล่าง (~5 บรรทัด ลบของเก่าที่เสร็จแล้ว)

## สถานะล่าสุด (8 พ.ย. 2569 เช้า)
- branch: `setup/stage0` = `main` (ขั้น 0) → `feat/stage1-core` (ขั้น 1 ครบ) → `feat/stage2-notes` (ขั้น 2 ครบ แตกจากขั้น 1) · push ขึ้น parnppk/StudyQuest แล้ว · **ยังไม่มี PR** (เปิดหลังเจ้าของเทสผ่านทีละขั้น)
- **ยังไม่เคยรันกับ Supabase จริงเลย** — เจ้าของทำตาม `docs/DEPLOY_PWA.md` (สร้างโปรเจกต์สิงคโปร์, Google, รัน 2 migration — แก้ YOUR-PROJECT-REF ก่อน, VAPID, deploy send-push) แล้วเทสขั้น 1 → ขั้น 2
- ขั้น 1: ตั้งค่าเทอม/เกณฑ์ขาด, แท็บวิชา + `app/subject/edit.tsx`, หน้าวันนี้ (เช็กชื่อ optimistic), หน้าวิชา, แท็บงาน + `components/AddTaskForm` · วันที่/เวลาพิมพ์เป็นตัวอักษร (ยังไม่มี date picker)
- ขั้น 2: `app/note/[slotId].tsx` (ข้อความ รูปย่อ หัวข้อ ★ กลาง/ปลายภาค เพิ่มงาน), การ์ดยังไม่ได้จด, `components/NotesTimeline`, `components/PushCard` + `app/install.tsx` (mockup `docs/mockups/stage2.html` ทำโดยไม่ได้รออนุมัติ — เจ้าของสั่งทำต่อเอง), cron `send_due_reminders()` ทุก 5 นาที · ค่าเตือนเริ่มต้น 10 นาที/24 ชม. (ตั้งได้ในหน้าตั้งค่า)
- logic ล่วงหน้า: `lib/grades.ts` (ขั้น 3), `lib/xp.ts` (ขั้น 4 · `dailyCapPerSubject` = 60 เดาไว้ ต้องถาม), `lib/review.ts` (ขั้น 5) · เทสต์รวม 22 ข้อผ่าน
- ถัดไป: ขั้น 3 คะแนนและเกรด (ต้องทำ mockup แท็บคะแนนในหน้าวิชาก่อน) · ไอคอนแอปยังเป็น placeholder ของ Expo
