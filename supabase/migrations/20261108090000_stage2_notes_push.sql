-- ขั้น 2: จดหลังคาบ (โน้ต หัวข้อ รูป) + แจ้งเตือน push (แพตเทิร์น LabHub) + cron เตือนหลังเลิกคาบ / ก่อนส่งงาน
-- เจ้าของรันเองใน Supabase SQL Editor
-- ⚠️ ก่อนรัน: แก้ YOUR-PROJECT-REF ใน _push_notification() ให้เป็น ref ของโปรเจกต์ (ดูใน Project Settings)
-- ต้องเปิด extension pg_cron + pg_net ก่อน (Database → Extensions) — คำสั่งด้านล่างเปิดให้ถ้ามีสิทธิ์

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------- ตั้งค่าการเตือนในโปรไฟล์ ----------
alter table public.profiles
  add column remind_after_class_min int not null default 10 check (remind_after_class_min between 0 and 180),
  add column remind_due_hours int not null default 24 check (remind_due_hours between 1 and 168);

-- ---------- class_notes (1 คาบ = 1 โน้ต) ----------
create table public.class_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slot_id uuid references public.class_slots (id) on delete set null,
  date date not null,
  text text check (char_length(text) <= 2000),
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index class_notes_one_per_slot on public.class_notes (user_id, slot_id, date);
create index class_notes_subject_idx on public.class_notes (user_id, subject_id, date desc);
alter table public.class_notes enable row level security;
create policy class_notes_own on public.class_notes for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- topics (หัวข้อที่เรียน · ใช้ต่อในขั้น 5 ทวน/บอส) ----------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  note_id uuid references public.class_notes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  is_starred boolean not null default false,
  exam text check (exam in ('midterm', 'final')),
  review_stage smallint not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now()
);
create index topics_subject_idx on public.topics (user_id, subject_id);
alter table public.topics enable row level security;
create policy topics_own on public.topics for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- Storage: รูปกระดาน note-photos/<user_id>/... (private · เปิดดูผ่าน signed URL) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-photos', 'note-photos', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy note_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'note-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy note_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'note-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy note_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'note-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- push_subscriptions (เหมือน LabHub) ----------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy push_subs_select_own on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy push_subs_insert_own on public.push_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_subs_delete_own on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));

-- สมัครซ้ำ/เครื่องเดิมเปลี่ยนบัญชี: endpoint เดิมย้ายมาเป็นของคนที่ล็อกอินล่าสุด
create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'ข้อมูลการสมัครแจ้งเตือนไม่ถูกต้อง';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end $$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- ---------- notifications (สร้างโดย cron เท่านั้น · ref กันเตือนซ้ำ) ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  url text not null default '/today',
  ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ref)
);
alter table public.notifications enable row level security;
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));

-- แถวใหม่ → Edge Function send-push (เฉพาะคนที่มีเครื่องลงทะเบียน · ประหยัด Disk IO)
create function public._push_notification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    perform net.http_post(
      url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-push',
      body := jsonb_build_object('id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 5000
    );
  end if;
  return null;
exception when others then
  return null; -- ส่ง push ไม่ได้ต้องไม่ทำให้การสร้างแจ้งเตือนล้ม
end $$;
revoke execute on function public._push_notification() from public, anon, authenticated;
create trigger notifications_push after insert on public.notifications
  for each row execute function public._push_notification();

-- ---------- cron: เตือนจดหลังเลิกคาบ + เตือนก่อนส่งงาน (ทุก 5 นาที) ----------
-- ทำเฉพาะผู้ใช้ที่เปิดแจ้งเตือนไว้ (join push_subscriptions) → คนอื่นไม่กิน Disk IO
-- คาบ: เลิกแล้ว + remind_after_class_min ภายใน 30 นาทีล่าสุด, อยู่ในเทอมปัจจุบัน, ยังไม่จด, ไม่ได้เช็ก "ไม่มีเรียน"
create function public.send_due_reminders() returns void
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

  insert into public.notifications (user_id, title, body, url, ref)
  select a.created_by, 'ใกล้ส่ง: ' || a.title,
         'กำหนดส่ง ' || to_char(a.due_at at time zone 'Asia/Bangkok', 'DD/MM HH24:MI') || ' น.',
         '/tasks', 'due:' || a.id
  from public.assignments a
  join public.profiles p on p.id = a.created_by
  where a.due_at > now() and a.due_at <= now() + make_interval(hours => p.remind_due_hours)
    and exists (select 1 from public.push_subscriptions ps where ps.user_id = a.created_by)
    and not exists (select 1 from public.assignment_status st where st.assignment_id = a.id and st.user_id = a.created_by and st.done)
  on conflict (user_id, ref) do nothing;

  -- เก็บแจ้งเตือนไว้ 14 วันพอ
  delete from public.notifications where created_at < now() - interval '14 days';
end $$;
revoke execute on function public.send_due_reminders() from public, anon, authenticated;

select cron.schedule('studyquest-reminders', '*/5 * * * *', 'select public.send_due_reminders()');
