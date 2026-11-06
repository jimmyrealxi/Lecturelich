-- ขั้น 1: แกนหลักส่วนตัว (โปรไฟล์ เทอม วิชา ตารางเรียน เช็กชื่อ งาน)
-- เจ้าของรันเองใน Supabase SQL Editor · ทุกตารางส่วนตัว RLS = user_id = auth.uid()
-- assignments มี room_id ไว้ก่อน (ห้องร่วม = ขั้น 6 จะเพิ่มตาราง rooms + FK + policy สมาชิกห้อง)

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  min_attendance_pct int not null default 80 check (min_attendance_pct between 0 and 100),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ล็อกอิน Google ครั้งแรก → สร้างโปรไฟล์จากชื่อ/รูปใน Google
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- terms ----------
create table public.terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index terms_user_idx on public.terms (user_id);
-- เทอมปัจจุบันมีได้คนละ 1 เทอม
create unique index terms_one_current on public.terms (user_id) where is_current;
alter table public.terms enable row level security;
create policy terms_own on public.terms for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- subjects ----------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  code text check (char_length(code) <= 20), -- รหัสวิชา (ใช้จับคู่งานในห้องร่วม)
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#1F4E9C' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  classroom_url text,
  line_url text,
  notebooklm_url text,
  grade_cutoffs jsonb not null default '{"A":80,"B+":75,"B":70,"C+":65,"C":60,"D+":55,"D":50}',
  target_grade text not null default 'A',
  created_at timestamptz not null default now()
);
create index subjects_user_term_idx on public.subjects (user_id, term_id);
alter table public.subjects enable row level security;
create policy subjects_own on public.subjects for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- class_slots (ซ้ำทุกสัปดาห์ · คาบรายวันคำนวณใน lib/schedule.ts ไม่สร้างแถวล่วงหน้า) ----------
create table public.class_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = อาทิตย์
  start_time time not null,
  end_time time not null,
  room text check (char_length(room) <= 40),
  check (end_time > start_time)
);
create index class_slots_user_idx on public.class_slots (user_id);
alter table public.class_slots enable row level security;
create policy class_slots_own on public.class_slots for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- attendance (เก็บเฉพาะคาบที่เช็กแล้ว) ----------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slot_id uuid not null references public.class_slots (id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'no_class')),
  updated_at timestamptz not null default now(),
  unique (user_id, slot_id, date)
);
create index attendance_user_subject_idx on public.attendance (user_id, subject_id);
alter table public.attendance enable row level security;
create policy attendance_own on public.attendance for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- assignments (ขั้นนี้ = งานส่วนตัว room_id null เท่านั้น) ----------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid, -- ขั้น 6: references rooms
  subject_id uuid references public.subjects (id) on delete set null,
  course_code text check (char_length(course_code) <= 20),
  title text not null check (char_length(title) between 1 and 120),
  due_at timestamptz,
  source text not null default 'class' check (source in ('classroom', 'class', 'line')),
  link text,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index assignments_owner_idx on public.assignments (created_by, due_at);
alter table public.assignments enable row level security;
create policy assignments_own on public.assignments for all
  using (created_by = (select auth.uid()) and room_id is null)
  with check (created_by = (select auth.uid()) and room_id is null);

-- ---------- assignment_status (ส่วนตัวเสมอ แม้งานจะแชร์) ----------
create table public.assignment_status (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  done boolean not null default false,
  submitted_at timestamptz,
  primary key (user_id, assignment_id)
);
alter table public.assignment_status enable row level security;
create policy assignment_status_own on public.assignment_status for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
