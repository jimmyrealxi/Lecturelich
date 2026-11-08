# ตั้งค่า Supabase + ขึ้นเว็บ (Vercel) + เปิด Web Push

> ทำตามลำดับ · ข้อที่ต้องใช้บัญชี/คีย์ลับ เจ้าของทำเอง (Claude ไม่รัน migration และไม่ใส่คีย์)

## 1. สร้างโปรเจกต์ Supabase
1. <https://supabase.com> → New project → **Region: Southeast Asia (Singapore)**
2. Authentication → Providers → **Google** → เปิด ใส่ Client ID/Secret จาก Google Cloud Console (Redirect URI ของ Google = `https://<ref>.supabase.co/auth/v1/callback`)
3. Authentication → URL Configuration → Redirect URLs เพิ่ม `http://localhost:8081/**` (และโดเมน Vercel ในข้อ 4)
4. Database → Extensions → เปิด **pg_cron** และ **pg_net**

## 2. รัน migration (SQL Editor) ตามลำดับชื่อไฟล์
1. `supabase/migrations/20261107120000_stage1_core.sql`
2. `supabase/migrations/20261108090000_stage2_notes_push.sql` — **ก่อนรันแก้ `YOUR-PROJECT-REF`** ใน `_push_notification()` เป็น ref ของโปรเจกต์ (เห็นใน URL โปรเจกต์)
3. `20261109090000_stage3_grades.sql` → 4. `20261110090000_stage4_xp.sql` → 5. `20261111090000_stage5_review.sql` → 6. `20261112090000_stage6_rooms.sql`

แต่ละไฟล์: วางทั้งไฟล์ใน SQL Editor → Run → ต้องขึ้น `Success. No rows returned` ก่อนไปไฟล์ถัดไป · error = หยุด ก๊อปข้อความมาถาม

## 3. ใส่ค่าให้แอป
ก๊อป `.env.example` เป็น `.env` แล้วใส่ `EXPO_PUBLIC_SUPABASE_URL` กับ `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API) → `npm run web`

## 4. Push: VAPID + Edge Function
```bash
npx web-push generate-vapid-keys
```
Supabase → Edge Functions → Secrets เพิ่ม `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (ห้าม commit), `VAPID_SUBJECT` = `mailto:อีเมลคุณ`

```bash
npx supabase login
```
```bash
npx supabase functions deploy send-push --project-ref <ref> --no-verify-jwt
```
ตรวจ: เปิด `https://<ref>.supabase.co/functions/v1/send-push` ต้องได้ `{"publicKey":"..."}`

## 5. Vercel
ก่อน: commit + push branch ล่าสุด (`main` ยังเป็นขั้น 0) · Import repo `parnppk/StudyQuest` → Framework = Other → หลังสร้างแล้ว Settings → Git → **Production Branch = branch ล่าสุด** (เช่น `feat/stage6-rooms`, เปลี่ยนกลับเป็น `main` หลัง merge) → เพิ่ม Environment Variables 2 ตัวเดียวกับ `.env` → Deploy (build อ่านจาก `vercel.json`) → เอาโดเมนไปใส่ Redirect URLs ในข้อ 1.3

## 6. เทสบนมือถือ (ต้อง HTTPS = โดเมน Vercel)
- **iPhone (iOS 16.4+)**: Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม → เปิดจากไอคอน → ล็อกอิน → ตั้งค่า → เปิดการแจ้งเตือน (หน้า `/install` มีวิธีในแอป)
- **Android**: Chrome → ตั้งค่า → เปิดการแจ้งเตือน
- ทดสอบเร็ว: ตั้งคาบให้จบในอีก ~5 นาที ตั้ง "เตือนจดหลังเลิกคาบ" = 0 นาที แล้วรอ (cron ทุก 5 นาที)

## ถ้าแจ้งเตือนไม่เด้ง
- SQL Editor: `select status_code, content, created from net._http_response order by created desc limit 5;`
  - `503 not_configured` = ยังไม่ใส่ VAPID · `{"sent":0}` = แจ้งเตือนเก่าเกิน 2 นาที / ไม่มีเครื่องลงทะเบียน
- `select * from cron.job_run_details order by start_time desc limit 5;` ดูว่า cron รันไหม
- แก้ `public/sw.js` แล้วต้องเปลี่ยน `VERSION`
