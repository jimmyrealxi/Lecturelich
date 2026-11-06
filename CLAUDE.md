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

## สถานะล่าสุด (9 พ.ย. 2569)
- branch: `main` (ขั้น 0) → `feat/stage1-core` → `feat/stage2-notes` → `feat/stage3-grades` (push แล้ว) → `feat/stage4-xp` (ขั้น 4 เขียนครบ **ยังไม่ commit**) · ยังไม่มี PR
- **ยังไม่เคยรันกับ Supabase จริง** — ทำตาม `docs/DEPLOY_PWA.md` แล้วรัน migration 4 ไฟล์ตามลำดับ (ขั้น 2 แก้ YOUR-PROJECT-REF ก่อน) แล้วเทสทีละขั้น
- ขั้น 3: `grade_components`/`scores` + `components/GradesPanel` ในหน้าวิชา · mockup `docs/mockups/stage3.html` **ยังไม่ได้อนุมัติ**
- ขั้น 4: `xp_events` ให้ XP ด้วย trigger ใน DB เท่านั้น (เช็กชื่อ/จดโน้ต/ส่งงาน · ยกเลิก = คืน XP · unique กันซ้ำ · เพดานต่อวิชาต่อวันเวลาไทย) · ค่า XP ฝั่ง DB = `xp_value()` มีเทสต์เทียบกับ `lib/xp.ts` · RPC `xp_overview()` · หน้าเกม + `components/game/XpPop` (เด้งเมื่อ XP จาก DB เพิ่ม — ช้ากว่ากดราว 1 รอบเน็ต) · เทสต์ 26 ข้อผ่าน
- ค้าง/ต้องถาม: `dailyCapPerSubject` = 60 ยังเดา · XP ทวน (`review`, เพดาน 30/วัน) ยังไม่ต่อ trigger → ขั้น 5 · ชิป LV บนหน้าวันนี้ยังไม่ทำ · sprite ยังเป็นกล่อง placeholder
- ถัดไป: ขั้น 5 ทวนและบอส (`lib/review.ts` มีแล้ว) · ไอคอนแอปยังเป็น placeholder
