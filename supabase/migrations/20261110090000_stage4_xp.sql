-- ขั้น 4: XP และเลเวล · เจ้าของรันเองใน Supabase SQL Editor (หลัง migration ขั้น 1–3)
-- XP ให้โดย trigger ในฐานข้อมูลเท่านั้น (แอปเขียน xp_events ตรงไม่ได้) → ปลอม XP จากฝั่งเครื่องไม่ได้
-- ค่า XP ต้องตรงกับ XP_CONFIG ใน lib/xp.ts (มีเทสต์ lib/xp.test.ts เทียบกับไฟล์นี้)

-- ---------- ค่า XP (ที่เดียวฝั่ง DB) ----------
create or replace function public.xp_value(p_key text) returns int
language sql immutable set search_path = '' as $$
  select case p_key
    when 'attend' then 5
    when 'note' then 10
    when 'notePhoto' then 5
    when 'submitEarly' then 20
    when 'submitOnTime' then 10
    when 'review' then 3
    when 'reviewDailyCap' then 30
    when 'start5' then 5
    when 'dailyCapPerSubject' then 60
    when 'levelStep' then 50
  end
$$;

-- ---------- xp_events ----------
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade, -- null = งานที่ไม่ผูกวิชา
  action text not null check (action in ('attend', 'note', 'notePhoto', 'submit', 'review', 'start5')),
  ref_id uuid not null, -- แถวที่ทำให้ได้ XP (attendance / class_notes / assignment)
  xp int not null check (xp > 0),
  day date not null default (now() at time zone 'Asia/Bangkok')::date, -- ใช้กับเพดานต่อวัน
  created_at timestamptz not null default now(),
  unique (user_id, action, ref_id) -- กันได้ XP ซ้ำจากการกระทำเดียวกัน
);
create index xp_events_cap_idx on public.xp_events (user_id, subject_id, day);
alter table public.xp_events enable row level security;
create policy xp_events_select_own on public.xp_events for select to authenticated using (user_id = (select auth.uid()));
-- ไม่มี policy insert/update/delete → เขียนได้เฉพาะฟังก์ชัน security definer ด้านล่าง

-- ให้ XP ตามเพดานต่อวันต่อวิชา (เวลาไทย) · ได้ 0 = ไม่บันทึก
create or replace function public._grant_xp(p_user uuid, p_subject uuid, p_action text, p_ref uuid, p_amount int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'Asia/Bangkok')::date;
  v_earned int;
  v_amount int;
begin
  if p_amount is null or p_amount <= 0 then return; end if;
  -- กันสองคำสั่งพร้อมกันหลุดเพดาน
  perform pg_advisory_xact_lock(hashtext(p_user::text || coalesce(p_subject::text, '-')));
  select coalesce(sum(xp), 0) into v_earned from public.xp_events
    where user_id = p_user and subject_id is not distinct from p_subject and day = v_day;
  v_amount := least(p_amount, public.xp_value('dailyCapPerSubject') - v_earned);
  if v_amount <= 0 then return; end if;
  insert into public.xp_events (user_id, subject_id, action, ref_id, xp, day)
  values (p_user, p_subject, p_action, p_ref, v_amount, v_day)
  on conflict (user_id, action, ref_id) do nothing;
end $$;
revoke execute on function public._grant_xp(uuid, uuid, text, uuid, int) from public, anon, authenticated;

-- มาเรียน +5 · เปลี่ยนเป็นขาด/ไม่มีเรียน = คืน XP
create or replace function public._xp_attendance() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'present' then
    perform public._grant_xp(new.user_id, new.subject_id, 'attend', new.id, public.xp_value('attend'));
  elsif tg_op = 'UPDATE' and old.status = 'present' then
    delete from public.xp_events where user_id = new.user_id and action = 'attend' and ref_id = new.id;
  end if;
  return null;
end $$;
create trigger attendance_xp after insert or update of status on public.attendance
  for each row execute function public._xp_attendance();

-- จดหลังคาบ +10 (ต้องมีข้อความหรือรูป) · มีรูป +5
create or replace function public._xp_note() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(btrim(new.text), '') <> '' or cardinality(new.photo_paths) > 0 then
    perform public._grant_xp(new.user_id, new.subject_id, 'note', new.id, public.xp_value('note'));
  end if;
  if cardinality(new.photo_paths) > 0 then
    perform public._grant_xp(new.user_id, new.subject_id, 'notePhoto', new.id, public.xp_value('notePhoto'));
  end if;
  return null;
end $$;
create trigger class_notes_xp after insert or update of text, photo_paths on public.class_notes
  for each row execute function public._xp_note();

-- ส่งงาน: ก่อนกำหนด ≥ 1 วัน +20 · ตรงเวลา +10 · เลยกำหนด 0 (ตรงกับ submitXp ใน lib/xp.ts) · ยกเลิกส่ง = คืน XP
create or replace function public._xp_submit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_due timestamptz;
  v_subject uuid;
  v_at timestamptz := coalesce(new.submitted_at, now());
begin
  if new.done then
    select due_at, subject_id into v_due, v_subject from public.assignments where id = new.assignment_id;
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
create trigger assignment_status_xp after insert or update of done on public.assignment_status
  for each row execute function public._xp_submit();

-- ---------- เลเวล: XP ขึ้นเลเวลถัดไป = levelStep × เลเวล (ตรงกับ levelFromXp) ----------
-- XP สะสมถึงเลเวล L = step × L(L−1)/2 → L = floor((1 + √(1 + 8·xp/step)) / 2)
create or replace function public.xp_level(p_xp int) returns jsonb
language sql immutable set search_path = '' as $$
  with s as (select public.xp_value('levelStep')::numeric as step, greatest(coalesce(p_xp, 0), 0) as xp),
  l as (select step, xp, floor((1 + sqrt(1 + 8 * xp / step)) / 2)::int as lv from s)
  select jsonb_build_object('xp', xp, 'level', lv, 'into', xp - (step * lv * (lv - 1) / 2)::int, 'need', (step * lv)::int) from l
$$;

-- หน้าเกม: ตัวละคร (XP ทุกเทอม) + วิชาในเทอมปัจจุบัน (ซีซั่น) · RLS ของผู้เรียกกรองข้อมูลเอง
create or replace function public.xp_overview() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'total', public.xp_level((select coalesce(sum(xp), 0)::int from public.xp_events where user_id = (select auth.uid()))),
    'subjects', coalesce((
      select jsonb_agg(jsonb_build_object('subject_id', s.id, 'name', s.name, 'color', s.color)
        || public.xp_level(coalesce(x.xp, 0)) order by s.name)
      from public.subjects s
      join public.terms t on t.id = s.term_id and t.is_current
      left join (select subject_id, sum(xp)::int as xp from public.xp_events group by subject_id) x on x.subject_id = s.id
    ), '[]'::jsonb)
  )
$$;
grant execute on function public.xp_overview() to authenticated;
