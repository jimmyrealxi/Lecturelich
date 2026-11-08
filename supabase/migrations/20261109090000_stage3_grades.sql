-- ขั้น 3: คะแนนและเกรด · เจ้าของรันเองใน Supabase SQL Editor (หลัง migration ขั้น 1–2)
-- เกณฑ์ตัดเกรด / เกรดเป้าหมาย ใช้คอลัมน์ subjects.grade_cutoffs / target_grade ที่มีอยู่แล้ว
-- คะแนนรวมและ "ปลายภาคต้องได้เท่าไหร่" คำนวณใน lib/grades.ts (ข้อมูลต่อวิชาไม่กี่แถว)

-- ---------- grade_components (สัดส่วนคะแนนของวิชา เช่น เก็บ 30 / กลางภาค 30 / ปลายภาค 40) ----------
create table public.grade_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  weight numeric(5,2) not null check (weight > 0 and weight <= 100), -- % ของเกรด
  max_score numeric(6,2) not null check (max_score > 0), -- คะแนนเต็มของส่วนนี้
  is_final boolean not null default false, -- ส่วนที่ใช้คำนวณ "ต้องได้อย่างน้อย"
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);
create index grade_components_subject_idx on public.grade_components (user_id, subject_id, sort);
create unique index grade_components_one_final on public.grade_components (subject_id) where is_final;
alter table public.grade_components enable row level security;
create policy grade_components_own on public.grade_components for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- scores (คะแนนแต่ละรายการในส่วนนั้น เช่น ควิซ 1 ได้ 9/10) ----------
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  component_id uuid not null references public.grade_components (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete set null,
  title text check (char_length(title) <= 60),
  score numeric(6,2) not null check (score >= 0),
  max_score numeric(6,2) not null check (max_score > 0), -- ได้เกินเต็มได้ (คะแนนโบนัส)
  created_at timestamptz not null default now()
);
create index scores_component_idx on public.scores (user_id, component_id);
alter table public.scores enable row level security;
create policy scores_own on public.scores for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
