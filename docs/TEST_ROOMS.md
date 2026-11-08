# ทดสอบห้องร่วม 2 บัญชี (ขั้น 6)

> ใช้ Google 2 บัญชี: **A** (เจ้าของห้อง) กับ **B** (เพื่อน) · เปิดคนละเบราว์เซอร์ หรือใช้หน้าต่างไม่ระบุตัวตน
> ก่อนเริ่ม: รัน migration ขั้น 1–6 ครบ · ทั้งสองบัญชีตั้งเทอมแล้ว และเพิ่มวิชา**รหัสเดียวกัน** (เช่น CS102)

## 1. ใช้งานปกติ
| # | ทำ | ผลที่ต้องได้ |
|---|---|---|
| 1 | A: ตั้งค่า → สร้างห้อง "ทดสอบ" | เห็นห้อง + โค้ด 8 ตัว · สมาชิก 1 คน |
| 2 | A: ชวนเพื่อน → ส่งลิงก์ให้ B · B เปิดลิงก์ (ยังไม่ล็อกอิน) | ล็อกอินแล้วกลับมาหน้า /room/โค้ด · กด "เข้าห้องนี้" ได้ |
| 3 | B: เข้าห้องด้วยโค้ดผิด | ขึ้น "ไม่พบห้องนี้" |
| 4 | A: เพิ่มงาน วิชา CS102 แชร์ไปที่ห้อง "ทดสอบ" | B เห็นงานในแท็บงาน **อยู่ในวิชา CS102 ของ B** มีป้าย "ห้องร่วม" · B ได้ push "งานใหม่ในห้อง" (ถ้าเปิดแจ้งเตือน) · A ไม่ได้ push ของตัวเอง |
| 5 | B: ติ๊กส่งแล้ว | A ยังเห็นงานเป็น "ยังไม่ส่ง" · B ได้ XP เข้าวิชาของ B |
| 6 | B: เพิ่มงานในห้อง | A เห็นงาน · (แอปยังไม่มีปุ่มแก้/ลบงาน — สิทธิ์แก้/ลบเช็กด้วย SQL ในข้อ 2) |
| 7 | B: ออกจากห้อง | งานของห้องหายจากรายการของ B · A เห็นสมาชิก 1 คน |
| 8 | A: ลบห้อง | งานในห้องหายจากทุกคน |

## 2. ข้อมูลส่วนตัวต้องรั่วไม่ได้ (รันใน SQL Editor ด้วยสิทธิ์ของ B)
ใน SQL Editor สวมสิทธิ์ B: `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid ของ B>"}';` (ใส่ใน transaction `begin; ... rollback;`) แล้วรันทีละข้อ — **ทุกข้อต้องได้ 0 แถว หรือ error**

```sql
-- B ไม่เห็นข้อมูลส่วนตัวของ A
select count(*) from subjects where user_id = '<uuid ของ A>';           -- 0
select count(*) from class_notes where user_id = '<uuid ของ A>';        -- 0
select count(*) from scores where user_id = '<uuid ของ A>';             -- 0
select count(*) from attendance where user_id = '<uuid ของ A>';         -- 0
select count(*) from xp_events where user_id = '<uuid ของ A>';          -- 0
select count(*) from assignment_status where user_id = '<uuid ของ A>';  -- 0 (สถานะส่งของ A)
select count(*) from assignments where created_by = '<uuid ของ A>' and room_id is null; -- 0 (งานส่วนตัวของ A)
-- B เขียนข้ามสิทธิ์ไม่ได้
insert into room_members (room_id, user_id) values ('<ห้องที่ B ไม่ได้อยู่>', '<uuid ของ B>');  -- error (ต้องเข้าผ่าน join_room)
insert into assignments (title, room_id) values ('x', '<ห้องที่ B ไม่ได้อยู่>');                 -- error
update assignments set title = 'แก้' where created_by = '<uuid ของ A>';                       -- 0 แถว (B ไม่ใช่เจ้าของห้อง)
insert into xp_events (user_id, action, ref_id, xp) values ('<uuid ของ B>', 'attend', gen_random_uuid(), 999); -- error
```

```sql
-- สวมสิทธิ์ A (เจ้าของห้อง): แก้/ลบงานที่ B สร้างในห้องได้ · สวมสิทธิ์ C (สมาชิกอื่น ไม่ใช่เจ้าของ): ต้องได้ 0 แถว
update assignments set title = title || ' (แก้)' where room_id = '<id ห้อง>' and created_by = '<uuid ของ B>';
```
