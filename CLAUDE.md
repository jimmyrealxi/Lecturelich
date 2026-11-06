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
- branch ต่อกันเป็นสาย: `main` (ขั้น 0) → `feat/stage1-core` → … → `feat/stage6-rooms` (งานล่าสุด commit แล้ว **ยังไม่ push**) · ยังไม่มี PR (ขั้น 1–5 แก้ไขต่อบน stage6 → คุยเรื่องเปิด PR ก่อน)
- **Supabase จริงแล้ว** ref `zuwmygzqoezgosyetahc` · migration 6 ไฟล์รันครบ · `.env` ใส่แล้ว (ไม่ commit) · dev: `.claude/launch.json` (`npm run web` พอร์ต 8081)
- เทสกับของจริง: ขั้น 1 ผ่าน · ขั้น 2 โน้ต+รูปผ่าน **เหลือ Push** (VAPID secrets + `supabase functions deploy send-push`, DEPLOY_PWA ข้อ 4) · ขั้น 3–6 ยังไม่เทส (ขั้น 6 ใช้ `docs/TEST_ROOMS.md`) · หน้าต่างเบราว์เซอร์ใน Claude ปิด `confirm()` อัตโนมัติ → เทสปุ่มลบใน Chrome จริง
- แก้ระหว่างเทส: `+html.tsx` ต้องวาง `headNodes/bodyNodes` (SDK 58 ไม่งั้นเว็บว่าง) · migration ขั้น 6 `$`→`$$` · คะแนนคิดตามงาน (ได้รวม/เต็มรวม × เต็มของส่วน, งานยังไม่กรอกไม่นับ, เต็มของส่วนเว้นว่าง = สัดส่วน)
- ข้อมูลทดสอบในบัญชีเจ้าของ: เทอมเริ่มถูกเลื่อนเป็นก่อน 9 พ.ย. + คาบคณิตถูกย้ายเป็น ส. 01:00–03:00 → เทสเสร็จเปลี่ยนกลับ (จ. 10:00)
- เสนอได้: คำเตือน "งานได้ 0 ให้กรอก 0" ใต้ช่องคะแนน · ถัดไปหลังเทสครบ: Vercel (Production Branch = branch ล่าสุด) · sprite/ไอคอน placeholder · ขั้น 7 ต้องคุยก่อน
- อ้างอิง: XP ด้วย trigger `xp_value()` + `xp_overview()` · ห้อง: `is_room_member/owner()` · แก้/ลบงานห้อง = คนสร้าง+เจ้าของห้อง (ยืนยันแล้ว) · เพดาน XP 60 · เทสต์ 32 ข้อ
