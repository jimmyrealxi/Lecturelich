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
- **ทำทีละขั้นตาม `docs/PLAN.md` ข้อ 8** จบขั้นแล้วหยุดรอเจ้าของทดสอบ/อนุมัติ · ข้อมูลไม่พอให้ถามก่อนเดา

## จดงานทุกครั้ง
หลังทำงานเสร็จ อัปเดต "สถานะล่าสุด" ด้านล่าง (~5 บรรทัด ลบของเก่าที่เสร็จแล้ว)

## สถานะล่าสุด (7 พ.ย. 2569)
- ขั้น 0 เสร็จ (รอเจ้าของทดสอบ) · branch `setup/stage0` · mockup อนุมัติแล้ว
- มีแล้ว: Expo 58 + expo-router 5 แท็บ (หน้า placeholder), `lib/theme.ts`, `docs/DESIGN.md`, PWA (manifest, `public/sw.js` เฉพาะ cache, `app/+html.tsx`, `vercel.json`), CI tsc+lint · `tsc` / `lint` / `expo export -p web` ผ่าน
- ไอคอนแอปยังเป็นของ template Expo (placeholder) · ยังไม่มี Supabase / TanStack Query / ระบบเทสต์ (เพิ่มในขั้น 1)
- ถัดไป: ขั้น 1 แกนหลักส่วนตัว (ต้องสร้างโปรเจกต์ Supabase สิงคโปร์ก่อน)
