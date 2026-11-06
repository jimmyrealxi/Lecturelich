-- ขั้น 5: วันสอบ (บอส) + ทวนหัวข้อแบบเว้นระยะ · เจ้าของรันเองใน Supabase SQL Editor (หลัง migration ขั้น 1–4)
-- เลือดบอส / พร้อมสอบ % / สถานะโหนด คำนวณใน lib/review.ts จากหัวข้อ (ข้อมูลไม่กี่สิบแถว)

-- ---------- exams (1 วิชา มีกลางภาค/ปลายภาค อย่างละ 1) ----------
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  kind text not null check (kind in ('midterm', 'final')),
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, subject_id, kind)
);
alter table public.exams enable row level security;
create policy exams_own on public.exams for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- ทวนหัวข้อ: เลื่อนรอบ + ให้ XP (ทวนได้เฉพาะหัวข้อที่ยังไม่ทวน หรือถึง/เลยรอบแล้ว → กดรัวไม่ได้ XP) ----------
-- รอบทวน 1, 3, 7, 14 วัน (รอบสุดท้ายวนที่ 14) ตรงกับ REVIEW_DAYS / afterReview ใน lib/review.ts (มีเทสต์เทียบ)
-- XP ทวน: xp_value('review') ต่อครั้ง ไม่เกิน xp_value('reviewDailyCap') ต่อวิชาต่อวัน และยังอยู่ใต้เพดานรวมต่อวิชา
create or replace function public.review_topic(p_topic uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_days int[] := array[1, 3, 7, 14];
  v_day date := (now() at time zone 'Asia/Bangkok')::date;
  t public.topics%rowtype;
  v_review_today int;
begin
  select * into t from public.topics where id = p_topic and user_id = v_uid for update;
  if not found then raise exception 'topic not found'; end if;

  if t.review_stage = 0 or t.next_review_at is null or t.next_review_at <= now() then
    update public.topics set
      review_stage = t.review_stage + 1,
      last_reviewed_at = now(),
      next_review_at = now() + make_interval(days => v_days[least(t.review_stage, array_length(v_days, 1) - 1) + 1])
    where id = p_topic
    returning * into t;

    select coalesce(sum(xp), 0) into v_review_today from public.xp_events
      where user_id = v_uid and subject_id = t.subject_id and action = 'review' and day = v_day;
    perform public._grant_xp(v_uid, t.subject_id, 'review', gen_random_uuid(),
      least(public.xp_value('review'), public.xp_value('reviewDailyCap') - v_review_today));
  end if;

  return jsonb_build_object('review_stage', t.review_stage, 'last_reviewed_at', t.last_reviewed_at, 'next_review_at', t.next_review_at);
end $$;
revoke execute on function public.review_topic(uuid) from public, anon;
grant execute on function public.review_topic(uuid) to authenticated;
