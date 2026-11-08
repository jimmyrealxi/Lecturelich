-- ขั้น 8: ดึงงานจาก Google Classroom เข้างานส่วนตัว (เฟส 1) · Edge Function: classroom

-- description = ช่องรายละเอียด (หน้ารายละเอียดงานแบบ A) · classroom_work_id = "รหัสห้อง/รหัสงาน" กันงานซ้ำ (null ไม่ชนกัน)
alter table public.assignments
  add column description text check (char_length(description) <= 4000),
  add column classroom_work_id text,
  add constraint assignments_classroom_uq unique (created_by, classroom_work_id);

-- สถานะการเชื่อมที่แอปอ่านได้ · แถวนี้สร้าง/แก้จาก Edge Function เท่านั้น
create table public.classroom_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_sync_at timestamptz,
  last_error text check (last_error in ('expired', 'failed')),
  created_at timestamptz not null default now()
);
alter table public.classroom_accounts enable row level security;
create policy classroom_accounts_select on public.classroom_accounts for select to authenticated
  using (user_id = (select auth.uid()));

-- ไม่มี policy = แอปอ่านไม่ได้เลย ใช้ได้เฉพาะ Edge Function (service role)
create table public.classroom_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null
);
alter table public.classroom_tokens enable row level security;

create table public.classroom_oauth_states (
  state uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  origin text not null,
  created_at timestamptz not null default now()
);
alter table public.classroom_oauth_states enable row level security;

-- ความลับของรอบตั้งเวลา สุ่มใน DB จึงไม่อยู่ใน repo
create table public.classroom_cron (
  id boolean primary key default true check (id),
  secret uuid not null default gen_random_uuid()
);
alter table public.classroom_cron enable row level security;
insert into public.classroom_cron default values;

-- ห้อง Classroom ของแต่ละคน · enabled = ติ๊กให้ดึง
create table public.classroom_courses (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id text not null,
  name text not null,
  section text,
  subject_id uuid references public.subjects (id) on delete set null,
  enabled boolean not null default false,
  primary key (user_id, course_id)
);
alter table public.classroom_courses enable row level security;
create policy classroom_courses_select on public.classroom_courses for select to authenticated
  using (user_id = (select auth.uid()));
create policy classroom_courses_update on public.classroom_courses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (subject_id is null or exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = (select auth.uid())))
  );

-- งานที่ลบแล้ว: รอบถัดไปไม่ดึงกลับมา
create table public.classroom_hidden (
  user_id uuid not null references auth.users (id) on delete cascade,
  work_id text not null,
  primary key (user_id, work_id)
);
alter table public.classroom_hidden enable row level security;
create policy classroom_hidden_select on public.classroom_hidden for select to authenticated
  using (user_id = (select auth.uid()));

create function public._classroom_tombstone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- ตอนลบบัญชี แถวใน auth.users หายก่อน จึงข้าม ไม่งั้น FK ล้ม
  if old.classroom_work_id is not null and exists (select 1 from auth.users where id = old.created_by) then
    insert into public.classroom_hidden (user_id, work_id) values (old.created_by, old.classroom_work_id) on conflict do nothing;
  end if;
  return null;
end $$;
revoke execute on function public._classroom_tombstone() from public, anon, authenticated;
create trigger assignments_classroom_tombstone after delete on public.assignments
  for each row execute function public._classroom_tombstone();

-- ดึงงานทุกชั่วโมง นาทีที่ 7
create function public.classroom_cron_sync() returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.classroom_accounts) then
    perform net.http_post(
      url := 'https://zuwmygzqoezgosyetahc.supabase.co/functions/v1/classroom',
      body := '{"action": "cron"}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select secret::text from public.classroom_cron)),
      timeout_milliseconds := 60000
    );
  end if;
end $$;
revoke execute on function public.classroom_cron_sync() from public, anon, authenticated;
select cron.schedule('classroom-sync', '7 * * * *', 'select public.classroom_cron_sync()');
