-- ขั้น 7c: ฉายาจากความสำเร็จ + ออกจากห้องแล้วงานของห้องหาย · เจ้าของรันเองใน Supabase SQL Editor (หลัง 7b)
-- ค่า need ต้องตรงกับ TITLES ใน lib/titles.ts (มีเทสต์เทียบ)
-- RLS: ไม่มีตารางใหม่ · papboy ยังไม่มี policy เขียน → เปลี่ยนฉายาได้เฉพาะผ่าน set_title()

alter table public.papboy add column if not exists title text;

-- นับจากประวัติ XP (ไม่มีตารางสะสมแยก) · ส่งก่อนกำหนดใช้เกณฑ์เดียวกับกล่องเงิน
create or replace function public._title_progress(p_user uuid) returns table (id text, have int, need int)
language sql stable security definer set search_path = '' as $$
  with c as (
    select
      count(*) filter (where x.action = 'attend')::int as att,
      count(*) filter (where x.action = 'note')::int as note,
      count(*) filter (where x.action = 'notePhoto')::int as photo,
      count(*) filter (where x.action = 'review')::int as rev,
      count(*) filter (where x.action = 'submit' and a.due_at - x.created_at >= interval '1 day')::int as early,
      (select count(*)::int from public.loot_boxes b where b.user_id = p_user and b.kind = 'gold') as boss
    from public.xp_events x left join public.assignments a on a.id = x.ref_id and x.action = 'submit'
    where x.user_id = p_user
  )
  select v.id, v.have, v.need from c cross join lateral (values
    ('start', 1, 1),
    ('attend10', att, 10),
    ('attend50', att, 50),
    ('note30', note, 30),
    ('photo20', photo, 20),
    ('early10', early, 10),
    ('review50', rev, 50),
    ('boss1', boss, 1)
  ) as v(id, have, need)
$$;
revoke execute on function public._title_progress(uuid) from public, anon, authenticated;

create or replace function public.title_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  return jsonb_build_object(
    'current', (select p.title from public.papboy p where p.user_id = v_uid),
    'have', (select jsonb_object_agg(t.id, t.have) from public._title_progress(v_uid) t)
  );
end $$;
revoke execute on function public.title_state() from public, anon;
grant execute on function public.title_state() to authenticated;

create or replace function public.set_title(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public._title_progress(v_uid) t where t.id = p_id and t.have >= t.need) then
    raise exception 'title locked';
  end if;
  insert into public.papboy (user_id, title) values (v_uid, p_id)
  on conflict (user_id) do update set title = excluded.title;
end $$;
revoke execute on function public.set_title(text) from public, anon;
grant execute on function public.set_title(text) to authenticated;

-- ออกจากห้องแล้วไม่เห็นงานของห้องนั้น แม้เป็นงานที่ตัวเองสร้าง (docs/TEST_ROOMS.md ข้อ 7)
drop policy assignments_select on public.assignments;
create policy assignments_select on public.assignments for select to authenticated
  using ((room_id is null and created_by = (select auth.uid())) or (room_id is not null and public.is_room_member(room_id)));
