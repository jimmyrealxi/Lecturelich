-- ขั้น 6: ห้องร่วม (แชร์ "งานและกำหนดส่ง" เท่านั้น) · เจ้าของรันเองใน Supabase SQL Editor (หลัง migration ขั้น 1–5)
-- ⚠️ ค่าเริ่มต้นตาม PLAN (ยังรอเจ้าของยืนยัน): งานในห้องแก้/ลบได้เฉพาะคนสร้างกับเจ้าของห้อง
-- สถานะส่งงาน (assignment_status) ยังเป็นของแต่ละคน · ข้อมูลอื่นทั้งหมดยังส่วนตัวตาม RLS เดิม

-- ---------- rooms ----------
-- โค้ดชวน 8 ตัว (ตัด 0 O 1 I ที่อ่านสับสน) · DEFAULT ใช้ subquery ไม่ได้จึงแยกเป็นฟังก์ชัน
create or replace function public._room_code() returns text
language sql volatile set search_path = '' as $
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 8)
$;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  code text not null unique default public._room_code() check (code ~ '^[A-Z0-9]{8}$'),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- room_members ----------
create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user_idx on public.room_members (user_id);

-- เช็กสมาชิก/เจ้าของแบบ security definer → policy ไม่อ้าง room_members ตัวเองวนซ้ำ
create or replace function public.is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members where room_id = p_room and user_id = (select auth.uid()))
$$;
create or replace function public.is_room_owner(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rooms where id = p_room and owner_id = (select auth.uid()))
$$;
revoke execute on function public.is_room_member(uuid), public.is_room_owner(uuid) from public, anon;
grant execute on function public.is_room_member(uuid), public.is_room_owner(uuid) to authenticated;

alter table public.rooms enable row level security;
create policy rooms_select on public.rooms for select to authenticated using (owner_id = (select auth.uid()) or public.is_room_member(id));
create policy rooms_insert on public.rooms for insert to authenticated with check (owner_id = (select auth.uid()));
create policy rooms_update on public.rooms for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy rooms_delete on public.rooms for delete to authenticated using (owner_id = (select auth.uid()));

alter table public.room_members enable row level security;
-- เห็นรายชื่อสมาชิกห้องที่ตัวเองอยู่ · เข้าห้องผ่าน join_room() เท่านั้น (ไม่มี policy insert)
create policy room_members_select on public.room_members for select to authenticated using (public.is_room_member(room_id));
-- ออกจากห้องเอง หรือเจ้าของห้องเอาสมาชิกออก (เจ้าของออกไม่ได้ ต้องลบห้อง)
create policy room_members_delete on public.room_members for delete to authenticated
  using ((user_id = (select auth.uid()) and not public.is_room_owner(room_id))
      or (public.is_room_owner(room_id) and user_id <> (select auth.uid())));

-- สร้างห้อง → เจ้าของเป็นสมาชิกอัตโนมัติ
create or replace function public._room_add_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.room_members (room_id, user_id) values (new.id, new.owner_id) on conflict do nothing;
  return null;
end $$;
revoke execute on function public._room_add_owner() from public, anon, authenticated;
create trigger rooms_add_owner after insert on public.rooms for each row execute function public._room_add_owner();

-- เข้าห้องด้วยโค้ด → คืน id และชื่อห้อง (โค้ดผิด = error)
create or replace function public.join_room(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.rooms%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  select * into r from public.rooms where code = upper(btrim(p_code));
  if not found then raise exception 'room not found'; end if;
  insert into public.room_members (room_id, user_id) values (r.id, (select auth.uid())) on conflict do nothing;
  return jsonb_build_object('id', r.id, 'name', r.name);
end $$;
revoke execute on function public.join_room(text) from public, anon;
grant execute on function public.join_room(text) to authenticated;

-- ---------- assignments: ผูกห้อง + RLS ใหม่ ----------
alter table public.assignments
  add constraint assignments_room_fk foreign key (room_id) references public.rooms (id) on delete cascade;
create index assignments_room_idx on public.assignments (room_id, due_at) where room_id is not null;

drop policy assignments_own on public.assignments;
create policy assignments_select on public.assignments for select to authenticated
  using (created_by = (select auth.uid()) or (room_id is not null and public.is_room_member(room_id)));
create policy assignments_insert on public.assignments for insert to authenticated
  with check (created_by = (select auth.uid()) and (room_id is null or public.is_room_member(room_id)));
create policy assignments_update on public.assignments for update to authenticated
  using (created_by = (select auth.uid()) or (room_id is not null and public.is_room_owner(room_id)))
  with check ((room_id is null and created_by = (select auth.uid())) or (room_id is not null and public.is_room_member(room_id)));
create policy assignments_delete on public.assignments for delete to authenticated
  using (created_by = (select auth.uid()) or (room_id is not null and public.is_room_owner(room_id)));

-- เติมรหัสวิชาให้งานอัตโนมัติ (เพื่อนในห้องจับคู่กับวิชาของตัวเองด้วยรหัสนี้)
create or replace function public._assignment_course_code() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.course_code is null and new.subject_id is not null then
    select code into new.course_code from public.subjects where id = new.subject_id;
  end if;
  return new;
end $$;
create trigger assignments_course_code before insert or update of subject_id on public.assignments
  for each row execute function public._assignment_course_code();

-- ---------- แจ้งเตือนสมาชิกคนอื่นเมื่อมีงานใหม่ในห้อง ----------
create or replace function public._notify_room_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.room_id is null then return null; end if;
  insert into public.notifications (user_id, title, body, url, ref)
  select m.user_id, 'งานใหม่ในห้อง ' || r.name, new.title ||
         coalesce(' · ส่ง ' || to_char(new.due_at at time zone 'Asia/Bangkok', 'DD/MM HH24:MI') || ' น.', ''),
         '/tasks', 'room-task:' || new.id
  from public.room_members m
  join public.rooms r on r.id = m.room_id
  where m.room_id = new.room_id and m.user_id <> new.created_by
  on conflict (user_id, ref) do nothing;
  return null;
end $$;
revoke execute on function public._notify_room_assignment() from public, anon, authenticated;
create trigger assignments_room_notify after insert on public.assignments
  for each row execute function public._notify_room_assignment();

-- ---------- cron เตือนก่อนส่งงาน: รวมสมาชิกห้องด้วย (ส่วนเตือนจดหลังคาบเหมือนขั้น 2) ----------
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
  where cs.weekday = extract(dow from today)
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

-- ---------- XP ส่งงาน: งานในห้องให้ XP เข้าวิชา "ของตัวเอง" (จับคู่ด้วยรหัสวิชาในเทอมปัจจุบัน) ----------
create or replace function public._xp_submit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_due timestamptz;
  v_subject uuid;
  v_code text;
  v_at timestamptz := coalesce(new.submitted_at, now());
begin
  if new.done then
    select a.due_at, case when s.user_id = new.user_id then s.id end, a.course_code
      into v_due, v_subject, v_code
      from public.assignments a left join public.subjects s on s.id = a.subject_id
      where a.id = new.assignment_id;
    if v_subject is null and v_code is not null then
      select s.id into v_subject from public.subjects s join public.terms t on t.id = s.term_id and t.is_current
        where s.user_id = new.user_id and s.code = v_code limit 1;
    end if;
    perform public._grant_xp(new.user_id, v_subject, 'submit', new.assignment_id,
      case
        when v_due is null then public.xp_value('submitOnTime')
        when v_due - v_at >= interval '1 day' then public.xp_value('submitEarly')
        when v_due >= v_at then public.xp_value('submitOnTime')
        else 0
      end);
  elsif tg_op = 'UPDATE' and old.done then
    delete from public.xp_events where user_id = new.user_id and action = 'submit' and ref_id = new.assignment_id;
  end if;
  return null;
end $$;
