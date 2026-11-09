-- เทสต์ migration ขั้น 10 · รันหลัง migration แล้วย้อนกลับเอง (ผู้ใช้ปลอม ไม่เหลือข้อมูล) · assert ไม่ผ่าน = error
begin;

create function pg_temp.reset() returns void language sql as $$
  delete from public.notifications where user_id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
  delete from public.assignments where created_by in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
  delete from public.attendance where user_id = '00000000-0000-4000-8000-00000000000a';
  delete from public.exams where user_id = '00000000-0000-4000-8000-00000000000a';
$$;
create function pg_temp.check_in(p_date date, p_when timestamptz) returns void language sql as $$
  insert into public.attendance (user_id, subject_id, slot_id, date, status, updated_at)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', p_date, 'present', p_when);
$$;
create function pg_temp.pile_of(p_ref text) returns text language sql as $$
  select l.pile from public.notifications n join public.push_lines l on l.id = n.line_id
  where n.user_id = '00000000-0000-4000-8000-00000000000a' and n.ref = p_ref;
$$;
create function pg_temp.work(p_title text, p_due timestamptz, p_created timestamptz default '2026-11-09 00:00+07') returns uuid language sql as $$
  insert into public.assignments (title, due_at, created_by, created_at, subject_id)
  values (p_title, p_due, '00000000-0000-4000-8000-00000000000a', p_created, '00000000-0000-4000-8000-0000000000c1') returning id;
$$;

insert into auth.users (id) values ('00000000-0000-4000-8000-00000000000a'), ('00000000-0000-4000-8000-00000000000b');
insert into public.profiles (id) values ('00000000-0000-4000-8000-00000000000a'), ('00000000-0000-4000-8000-00000000000b') on conflict do nothing;
insert into public.terms (id, user_id, name, start_date, end_date, is_current) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-00000000000a', 'เทส', '2026-11-01', '2027-03-01', true);
insert into public.subjects (id, user_id, term_id, name) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000d1', 'ฟิสิกส์');
-- เรียนทุกวันอังคาร 09:00–12:00 (10 พ.ย. 2569 = วันอังคาร)
insert into public.class_slots (id, user_id, subject_id, weekday, start_time, end_time) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000c1', 2, '09:00', '12:00');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('00000000-0000-4000-8000-00000000000a', 'https://example.test/a', 'k', 'a'),
  ('00000000-0000-4000-8000-00000000000b', 'https://example.test/b', 'k', 'a');

do $$
declare
  ua uuid := '00000000-0000-4000-8000-00000000000a';
  ub uuid := '00000000-0000-4000-8000-00000000000b';
  eve timestamptz := '2026-11-10 19:10+07';
  n int; r record; w uuid; t text;
begin
  -- บันได: รอบไหนมีงานที่เหลือกี่วัน
  assert public._round_has('evening', 30) and public._round_has('evening', -3) and public._round_has('evening', null), 'เย็นตามทุกงาน';
  assert not public._round_has('morning', 6) and public._round_has('morning', 5) and public._round_has('morning', 0) and not public._round_has('morning', -1), 'เช้า 0–5';
  assert public._round_has('night', 3) and public._round_has('night', 1) and not public._round_has('night', 4) and not public._round_has('night', 0), '21:00 1–3';
  assert public._round_has('noon', 1) and public._round_has('noon', 0) and not public._round_has('noon', 2), 'เที่ยง 0–1';
  assert public._work_pile(7) = 'chill' and public._work_pile(6) = 'chill' and public._work_pile(5) = 'nudge' and public._work_pile(4) = 'nudge'
     and public._work_pile(3) = 'tease' and public._work_pile(2) = 'tease' and public._work_pile(1) = 'stern' and public._work_pile(0) = 'today'
     and public._work_pile(-1) = 'late' and public._work_pile(null) = 'chill', 'กองตามวันที่เหลือ';

  -- เย็น: หลายงานรวมข้อความเดียว · เรียงงานด่วนสุด · รันซ้ำไม่เด้งซ้ำ
  perform pg_temp.work('ไกล', '2026-11-20 23:59+07');
  perform pg_temp.work('ใกล้', '2026-11-11 23:59+07');
  perform public.send_work_round('evening', eve);
  perform public.send_work_round('evening', eve);
  select count(*) into n from public.notifications where user_id = ua;
  assert n = 1, 'เย็นต้อง 1 ข้อความ ได้ ' || n;
  select * into r from public.notifications where user_id = ua;
  assert r.title like 'ค้าง 2 งาน · ด่วนสุด ใกล้ (พรุ่งนี้)%', 'หัวข้อรวมงาน: ' || r.title;
  assert r.body <> '' and r.body not like '%{%', 'แทนตัวแปรแล้ว: ' || r.body;
  assert (select pile from public.push_lines where id = r.line_id) = 'stern', 'น้ำเสียงตามงานด่วนสุด';

  -- ติ๊กส่งแล้วไม่ทวง · มีคาบวันนี้ = ชม
  perform pg_temp.reset();
  w := pg_temp.work('เสร็จ', '2026-11-11 23:59+07');
  insert into public.assignment_status (user_id, assignment_id, done) values (ua, w, true);
  perform public.send_work_round('evening', eve);
  assert pg_temp.pile_of('evening:2026-11-10') = 'unchecked', 'งานครบแต่คาบวันนี้ยังไม่เช็กชื่อ ต้องชวนเช็ก';
  delete from public.notifications where user_id = ua;
  perform pg_temp.check_in('2026-11-10', eve);
  perform public.send_work_round('evening', eve);
  select * into r from public.notifications where user_id = ua;
  assert r.title = 'วันนี้งานเคลียร์หมดแล้ว', 'ครบแล้วชม: ' || coalesce(r.title, 'ไม่มี');

  -- ไม่มีคาบ ไม่มีงาน ไม่ชม (พุธ)
  perform pg_temp.reset();
  perform public.send_work_round('evening', '2026-11-11 19:10+07');
  assert not exists (select 1 from public.notifications where user_id = ua), 'วันเปล่าไม่ต้องชม';

  -- งานไม่มีวันส่ง = คาบแรกหลังงานเข้าแอป และไม่เขียนลง due_at
  perform pg_temp.reset();
  w := pg_temp.work('ไม่มีวัน', null, '2026-11-10 13:00+07');
  select * into r from public._pending_work(ua, eve);
  assert r.due = '2026-11-17 09:00+07' and r.assumed and r.days = 7, 'คาบถัดไปจาก created_at: ' || r.due;
  assert (select due_at from public.assignments where id = w) is null, 'ห้ามเขียน due_at';
  -- เวลาผ่านไปแล้ววันสมมติไม่เลื่อนตาม = เลยกำหนด
  select * into r from public._pending_work(ua, '2026-11-20 19:10+07');
  assert r.due = '2026-11-17 09:00+07' and r.days = -3, 'ตรึงวันสมมติ';
  -- คาบนั้นงดสอน เลื่อนไปคาบถัดไป
  insert into public.attendance (user_id, subject_id, slot_id, date, status) values (ua, '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', '2026-11-17', 'no_class');
  select * into r from public._pending_work(ua, eve);
  assert r.due = '2026-11-24 09:00+07', 'ข้ามคาบงดสอน: ' || r.due;
  delete from public.attendance where user_id = ua;
  -- หัวข้อบอกว่าเป็นวันที่เดา
  perform public.send_work_round('evening', eve);
  select title into t from public.notifications where user_id = ua;
  assert t = 'ไม่มีวัน · คาบถัดไป อีก 7 วัน', 'บอกว่าเดาจากคาบ: ' || t;

  -- เช้า: งานยังไกล ไม่มีคาบ = ไม่ส่ง (พุธ) · มีงานใกล้ = ส่งภาพรวม
  perform pg_temp.reset();
  perform pg_temp.work('ไกล', '2026-11-20 23:59+07');
  perform public.send_work_round('morning', '2026-11-11 07:10+07');
  assert not exists (select 1 from public.notifications where user_id = ua), 'เช้า: เหลือ 9 วัน ไม่มีคาบ ไม่ส่ง';
  perform public.send_work_round('morning', '2026-11-10 07:10+07');
  select title into t from public.notifications where user_id = ua;
  assert t = 'วันนี้เรียน ฟิสิกส์ · ค้าง 1 งาน', 'เช้ามีคาบ: ' || coalesce(t, 'ไม่มี');
  -- ว่างทั้งวันในเทอม = กองว่าง · นอกเทอม = เงียบ
  perform pg_temp.reset();
  perform public.send_work_round('morning', '2026-11-11 07:10+07');
  select n.title, l.pile into r from public.notifications n join public.push_lines l on l.id = n.line_id where n.user_id = ua;
  assert r.title = 'วันนี้ไม่มีเรียน ไม่มีงานค้าง' and r.pile = 'free', 'เช้าว่าง';
  perform pg_temp.reset();
  perform public.send_work_round('morning', '2027-05-01 07:10+07');
  assert not exists (select 1 from public.notifications where user_id = ua), 'นอกเทอมเงียบ';

  -- ก่อนหมดเวลา: 3 ชม. แล้ว 1 ชม. ไม่ซ้ำ · หลายงานรวม
  perform pg_temp.reset();
  perform pg_temp.work('ก', '2026-11-10 22:00+07');
  perform pg_temp.work('ข', '2026-11-10 22:30+07');
  perform public._send_countdowns('2026-11-10 20:00+07');
  perform public._send_countdowns('2026-11-10 20:05+07');
  select count(*) into n from public.notifications where user_id = ua and ref like 'h3:%';
  assert n = 1, 'h3 รวมเป็น 1 ได้ ' || n;
  assert (select title from public.notifications where user_id = ua and ref like 'h3:%') = '2 งาน · เหลือไม่ถึง 3 ชม.', 'h3 หัวข้อ';
  perform public._send_countdowns('2026-11-10 21:30+07');
  select count(*) into n from public.notifications where user_id = ua and ref like 'h1:%';
  assert n = 1, 'h1 รวมเป็น 1 ได้ ' || n;
  perform public._send_countdowns('2026-11-10 21:31+07');
  assert (select count(*) from public.notifications where user_id = ua and ref like 'h1:%') = 1, 'h1 ไม่ซ้ำ';

  -- คำไม่ซ้ำ 6 ครั้งล่าสุด (กองมี 6 คำ)
  perform pg_temp.reset();
  perform pg_temp.work('ไกล', '2026-12-30 23:59+07');
  for i in 0..5 loop
    perform public.send_work_round('evening', '2026-11-10 19:10+07'::timestamptz + make_interval(days => i));
  end loop;
  assert (select count(distinct line_id) from public.notifications where user_id = ua) = 6, 'คำไม่ซ้ำ';

  -- งานห้อง: สมาชิกได้เตือน · คนนอกไม่ได้ · ไม่เห็นชื่อวิชาของคนสร้าง
  perform pg_temp.reset();
  insert into public.rooms (id, name, owner_id) values ('00000000-0000-4000-8000-0000000000f1', 'ห้อง', ua);
  insert into public.room_members (room_id, user_id) values ('00000000-0000-4000-8000-0000000000f1', ub) on conflict do nothing;
  insert into public.assignments (title, due_at, created_by, room_id, subject_id)
    values ('งานห้อง', '2026-11-11 23:59+07', ua, '00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000c1');
  select * into r from public._pending_work(ub, eve);
  assert r.work_title = 'งานห้อง' and r.subject_name is null, 'สมาชิกเห็นงาน ไม่เห็นวิชาคนอื่น';

  -- ขั้น 10b: ระดับงอน
  assert public._miss_pile(1) is null and public._miss_pile(2) = 'miss2' and public._miss_pile(3) = 'miss3' and public._miss_pile(5) = 'miss5'
     and public._miss_pile(7) = 'miss7' and public._miss_pile(10) = 'giveup' and public._miss_pile(11) is null and public._miss_pile(null) is null, 'ระดับงอน';

  -- หายไป 2 วัน งานยังไกล = งอน · งานด่วน = ดุตามบันได ไม่เอางอนมาทับ
  perform pg_temp.reset();
  perform pg_temp.check_in('2026-11-10', '2026-11-10 10:00+07');
  perform pg_temp.work('ไกล', '2026-11-30 23:59+07');
  perform public.send_work_round('evening', '2026-11-12 19:10+07');
  assert pg_temp.pile_of('evening:2026-11-12') = 'miss2', 'หาย 2 วัน: ' || coalesce(pg_temp.pile_of('evening:2026-11-12'), 'ไม่มี');
  perform pg_temp.work('ด่วน', '2026-11-13 23:59+07');
  delete from public.notifications where user_id = ua;
  perform public.send_work_round('evening', '2026-11-12 19:10+07');
  assert pg_temp.pile_of('evening:2026-11-12') = 'stern', 'งานด่วนไม่โดนทับ';

  -- ยอมแพ้ครั้งเดียว แล้วเงียบถ้าไม่มีงาน · แต่ยังตามงานต่อ
  perform pg_temp.reset();
  perform pg_temp.check_in('2026-11-10', '2026-11-10 10:00+07');
  perform public.send_work_round('evening', '2026-11-17 19:10+07'); -- อังคาร คาบวันนี้ยังไม่เช็ก หาย 7 วัน
  assert pg_temp.pile_of('evening:2026-11-17') = 'miss7', 'หาย 7 วัน';
  perform public.send_work_round('evening', '2026-11-20 19:10+07'); -- ศุกร์ ไม่มีคาบ ไม่มีของค้าง = ไม่ชวนลอย ๆ แต่เป็นคำศุกร์
  assert pg_temp.pile_of('evening:2026-11-20') = 'friday', 'ศุกร์เย็นในเทอม';
  perform public.send_work_round('evening', '2026-11-24 19:10+07'); -- หาย 14 วัน
  assert pg_temp.pile_of('evening:2026-11-24') is null, 'เลยยอมแพ้แล้วเงียบ';
  perform pg_temp.work('ค้าง', '2026-12-30 23:59+07');
  perform public.send_work_round('evening', '2026-12-01 19:10+07');
  assert pg_temp.pile_of('evening:2026-12-01') = 'chill', 'เลิกชวนแล้วแต่ยังตามงาน';

  -- กลับมาหลังหายไป
  perform pg_temp.reset();
  perform pg_temp.check_in('2026-11-03', '2026-11-03 10:00+07');
  perform pg_temp.check_in('2026-11-10', eve);
  perform pg_temp.work('ไกล', '2026-11-30 23:59+07');
  perform public.send_work_round('evening', eve);
  assert pg_temp.pile_of('evening:2026-11-10') = 'back', 'กลับมาแล้ว';

  -- ใกล้สอบขึ้นรอบเช้า แม้ไม่มีคาบ
  perform pg_temp.reset();
  insert into public.exams (user_id, subject_id, kind, date) values (ua, '00000000-0000-4000-8000-0000000000c1', 'midterm', '2026-11-14');
  perform pg_temp.work('ไกล', '2026-11-30 23:59+07');
  perform public.send_work_round('morning', '2026-11-11 07:10+07');
  select title into t from public.notifications where user_id = ua;
  assert t = 'ค้าง 1 งาน · สอบ ฟิสิกส์ อีก 3 วัน', 'สอบ: ' || coalesce(t, 'ไม่มี');
  assert pg_temp.pile_of('morning:2026-11-11') = 'exam', 'กองสอบ';

  -- สัปดาห์ทำครบ: เช็กชื่อครบ + งานจริงครบ · ไม่มีอะไร = null · ขาดก็นับ
  perform pg_temp.reset();
  assert public._week_complete(ua, '2026-10-05') is null, 'นอกเทอมไม่นับ';
  assert not public._week_complete(ua, '2026-11-09'), 'ยังไม่เช็กชื่อ';
  insert into public.attendance (user_id, subject_id, slot_id, date, status, updated_at)
    values (ua, '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000e1', '2026-11-10', 'absent', eve);
  assert public._week_complete(ua, '2026-11-09'), 'ขาดก็นับว่าเช็กแล้ว';
  w := pg_temp.work('ในสัปดาห์', '2026-11-13 23:59+07');
  assert not public._week_complete(ua, '2026-11-09'), 'งานจริงยังไม่ติ๊ก';
  perform pg_temp.work('ไม่มีวันส่งไม่นับ', null);
  insert into public.assignment_status (user_id, assignment_id, done) values (ua, w, true);
  assert public._week_complete(ua, '2026-11-09'), 'ติ๊กครบแล้ว และงานเดาวันไม่นับ';

  -- จันทร์เช้าบอกยอดสะสม · สัปดาห์ก่อนหน้าไม่ครบ เลขไม่หาย
  assert public._week_streak(ua, '2026-11-16') = 1, 'สะสม 1';
  perform pg_temp.check_in('2026-11-03', '2026-11-03 10:00+07');
  assert public._week_streak(ua, '2026-11-16') = 2, 'สะสม 2';
  delete from public.assignments where created_by = ua and due_at is null;
  perform public.send_work_round('morning', '2026-11-16 07:10+07');
  select title into t from public.notifications where user_id = ua and ref = 'morning:2026-11-16';
  assert t = 'ทำครบ 2 สัปดาห์แล้ว', 'จันทร์เช้า: ' || coalesce(t, 'ไม่มี');
  assert pg_temp.pile_of('morning:2026-11-16') = 'streak', 'กอง streak';
end $$;

rollback;
