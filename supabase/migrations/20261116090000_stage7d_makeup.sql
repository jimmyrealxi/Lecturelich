-- คาบชดเชย: คาบครั้งเดียวในตาราง class_slots (docs/mockups/a-makeup-class.html)
-- RLS: ไม่มีตารางใหม่ · แถวคาบชดเชยอยู่ใต้ policy class_slots_own เดิม (เห็น/แก้ได้เฉพาะเจ้าของ)

-- null = ซ้ำทุกสัปดาห์ · มีค่า = เรียนครั้งเดียววันนั้น (weekday ต้องตรงกับวันที่ เพื่อไม่ให้ข้อมูลขัดกันเอง)
alter table public.class_slots add column makeup_date date;
alter table public.class_slots add constraint class_slots_makeup_weekday
  check (makeup_date is null or extract(dow from makeup_date) = weekday);

-- เตือนจดหลังคาบ: นับคาบชดเชยของวันนี้ด้วย และไม่ให้คาบชดเชยเตือนซ้ำทุกสัปดาห์ (ส่วนเตือนก่อนส่งงานเหมือนขั้น 6)
create or replace function public.send_due_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare
  now_bkk timestamp := now() at time zone 'Asia/Bangkok';
  today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  insert into public.notifications (user_id, title, body, url, ref)
  select cs.user_id, 'คาบ ' || s.name || ' จบแล้ว', 'จดสั้น ๆ ว่าวันนี้เรียนอะไร ถ่ายรูปกระดานได้ด้วย',
         '/note/' || cs.id || '?date=' || today, 'note:' || cs.id || ':' || today
  from public.class_slots cs
  join public.subjects s on s.id = cs.subject_id
  join public.terms t on t.id = s.term_id and t.is_current and today between t.start_date and t.end_date
  join public.profiles p on p.id = cs.user_id
  where (cs.makeup_date = today or (cs.makeup_date is null and cs.weekday = extract(dow from today)))
    and exists (select 1 from public.push_subscriptions ps where ps.user_id = cs.user_id)
    and (today + cs.end_time + make_interval(mins => p.remind_after_class_min)) between now_bkk - interval '30 minutes' and now_bkk
    and not exists (select 1 from public.class_notes n where n.user_id = cs.user_id and n.slot_id = cs.id and n.date = today)
    and not exists (select 1 from public.attendance a where a.user_id = cs.user_id and a.slot_id = cs.id and a.date = today and a.status = 'no_class')
  on conflict (user_id, ref) do nothing;

  -- ผู้รับ = คนสร้าง (งานส่วนตัว) หรือสมาชิกทุกคน (งานในห้อง) · ยังไม่ติ๊กส่งของตัวเอง
  insert into public.notifications (user_id, title, body, url, ref)
  select u.user_id, 'ใกล้ส่ง: ' || a.title,
         'กำหนดส่ง ' || to_char(a.due_at at time zone 'Asia/Bangkok', 'DD/MM HH24:MI') || ' น.',
         '/tasks', 'due:' || a.id
  from public.assignments a
  cross join lateral (
    select a.created_by as user_id where a.room_id is null
    union
    select m.user_id from public.room_members m where m.room_id = a.room_id
  ) u
  join public.profiles p on p.id = u.user_id
  where a.due_at > now() and a.due_at <= now() + make_interval(hours => p.remind_due_hours)
    and exists (select 1 from public.push_subscriptions ps where ps.user_id = u.user_id)
    and not exists (select 1 from public.assignment_status st where st.assignment_id = a.id and st.user_id = u.user_id and st.done)
  on conflict (user_id, ref) do nothing;

  delete from public.notifications where created_at < now() - interval '14 days';
end $$;
