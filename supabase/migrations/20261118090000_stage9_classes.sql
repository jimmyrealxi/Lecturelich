-- ขั้น 9: คลาสและสายย่อยรายเทอม · มีผลแค่หน้าตา ไม่แตะ XP เกรด คะแนนห้อง
-- เลือกคลาสได้ครั้งเดียวต่อเทอม · สายย่อยเปิดเมื่อถึงวันสอบกลางภาควิชาแรก ถ้าไม่ได้ตั้งวันสอบ = สัปดาห์ที่ 9 ของเทอม
-- เพิ่มคลาสใหม่: create or replace class_ascs() ใน migration ใหม่ + lib/classes.ts + CLASS_ART

create table public.term_classes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  class_id text not null,
  ascendancy_id text,
  picked_at timestamptz not null default now(),
  primary key (user_id, term_id)
);
create index term_classes_term_idx on public.term_classes (term_id);
alter table public.term_classes enable row level security;
-- อ่านได้เฉพาะของตัวเอง · ไม่มี policy เขียน เขียนผ่าน RPC ด้านล่างเท่านั้น
create policy term_classes_select on public.term_classes for select using (user_id = (select auth.uid()));

create function public.class_ascs(p_class text) returns text[]
language sql immutable set search_path = '' as $$
  select case p_class
    when 'scribe' then array['wild_scribe', 'board_decoder']
    when 'deadline' then array['last_minute', 'early_courier']
    when 'survivor' then array['dawn_guard', 'back_row']
    when 'necro' then array['night_lich', 'memory_shock']
  end
$$;

create function public.class_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_term public.terms;
  v_row public.term_classes;
  v_on date;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_term from public.terms where user_id = v_uid and is_current;
  if not found then return jsonb_build_object('term_id', null); end if;
  select * into v_row from public.term_classes where user_id = v_uid and term_id = v_term.id;
  select coalesce(min(e.date), v_term.start_date + 56) into v_on
    from public.exams e join public.subjects s on s.id = e.subject_id
    where e.user_id = v_uid and e.kind = 'midterm' and s.term_id = v_term.id;
  return jsonb_build_object(
    'term_id', v_term.id, 'class_id', v_row.class_id, 'ascendancy_id', v_row.ascendancy_id,
    'asc_on', v_on, 'asc_open', (now() at time zone 'Asia/Bangkok')::date >= v_on
  );
end $$;

create function public.pick_class(p_class text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_term uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if public.class_ascs(p_class) is null then raise exception 'bad_class'; end if;
  select id into v_term from public.terms where user_id = v_uid and is_current;
  if v_term is null then raise exception 'no_term'; end if;
  insert into public.term_classes (user_id, term_id, class_id) values (v_uid, v_term, p_class)
    on conflict (user_id, term_id) do nothing;
  if not found then raise exception 'class_taken'; end if;
end $$;

create function public.pick_ascendancy(p_asc text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_state jsonb := public.class_state(); v_class text := v_state ->> 'class_id';
begin
  if v_class is null then raise exception 'no_class'; end if;
  if not coalesce((v_state ->> 'asc_open')::boolean, false) then raise exception 'asc_locked'; end if;
  if not (p_asc = any (public.class_ascs(v_class))) then raise exception 'bad_asc'; end if;
  update public.term_classes set ascendancy_id = p_asc
    where user_id = v_uid and term_id = (v_state ->> 'term_id')::uuid and ascendancy_id is null;
  if not found then raise exception 'asc_taken'; end if;
end $$;

revoke all on function public.class_ascs(text), public.class_state(), public.pick_class(text), public.pick_ascendancy(text) from public, anon;
grant execute on function public.class_ascs(text), public.class_state(), public.pick_class(text), public.pick_ascendancy(text) to authenticated;
