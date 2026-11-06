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

## สถานะล่าสุด (7 พ.ย. 2569)
- ขั้น 0 commit แล้ว (`setup/stage0`) · ขั้น 1 กำลังทำบน `feat/stage1-core` (แตกจาก setup/stage0)
- ขั้น 1 มีแล้ว: `lib/schedule.ts` + เทสต์ (`npm test` = node --test), migration `20261107120000_stage1_core.sql` (**ยังไม่ได้รัน**), `lib/supabase.ts` (.env), ล็อกอิน Google (เว็บ), TanStack Query + แคช localStorage, หน้าวันนี้, `app/subject/[id].tsx`, `components/TaskRow` (optimistic)
- mockup ขั้น 1 อนุมัติแล้ว → ทำครบ: ตั้งค่า (เทอม, เกณฑ์ขาด, ออกจากระบบ), แท็บวิชา, `app/subject/edit.tsx` (เพิ่ม/แก้/ลบวิชา + ช่วงเวลา), แท็บงาน + `AddTaskForm` (ใช้ซ้ำได้ในขั้น 2) · query ตั้งค่าอยู่ `lib/queries/setup.ts` · ตรวจค่ากรอก `lib/input.ts`
- วันที่/เวลากรอกเป็นตัวอักษร (ปปปป-ดด-วว / HH:MM) — shortcut ยังไม่มี date picker
- **ขั้น 1 รอเจ้าของทดสอบจริง** (ยังไม่เคยรันกับ DB จริง) แล้วค่อยไปขั้น 2
- เจ้าของต้องทำ: สร้าง Supabase สิงคโปร์ → เปิด Google provider → รัน migration → ใส่ `.env` (ดู `.env.example`)
- logic ล่วงหน้า (ยังไม่มี UI/DB): `lib/grades.ts` (ขั้น 3), `lib/xp.ts` (ขั้น 4 · `dailyCapPerSubject` = 60 เดาไว้ ต้องถาม), `lib/review.ts` (ขั้น 5) · เทสต์รวม 18 ข้อผ่าน
- ไอคอนแอปยังเป็นของ template Expo (placeholder)
