-- ขั้น 7b: กล่องเงิน (เป้าย่อย 4 เรื่อง) · กล่องทอง (ล้มบอสประจำเทอม) · แลกเศษชอล์ก · เจ้าของตัดสิน 8 พ.ย.
-- เจ้าของรันเองใน Supabase SQL Editor (หลัง 20261113090000_stage7_loot.sql) · รันซ้ำได้
-- ค่าต้องตรงกับ LOOT_CONFIG ใน lib/papboy.ts (มีเทสต์ lib/papboy.test.ts เทียบกับไฟล์นี้)
-- นับจาก xp_events เท่านั้น (ของที่ได้ XP จริง) → ติดเพดาน XP ต่อวันก็ไม่นับ · ยกเลิก XP แล้วทำใหม่ไม่ได้กล่องซ้ำ (นับเทียบกล่องที่มี)

-- ---------- ค่ากล่อง (ทับของขั้น 7 ทั้งชุด) ----------
create or replace function public.loot_value(p_key text) returns int
language sql immutable set search_path = '' as $$
  select case p_key
    when 'ironEvery' then 50
    when 'oddsN' then 60
    when 'oddsM' then 28
    when 'oddsR' then 10
    when 'oddsU' then 2
    when 'pity' then 10
    when 'dupN' then 5
    when 'dupM' then 15
    when 'dupR' then 40
    when 'dupU' then 120
    when 'silverAttend' then 10
    when 'silverPhoto' then 5
    when 'silverEarly' then 3
    when 'silverReview' then 10
    when 'craftN' then 10
    when 'craftM' then 30
    when 'craftR' then 80
    when 'craftU' then 200
  end
$$;

-- ที่มาของกล่อง: null = เหล็ก (ตาม XP) · attend / photo / early / review = เงิน · boss:<term_id> = ทอง
alter table public.loot_boxes add column if not exists source text;
create unique index if not exists loot_boxes_gold_once on public.loot_boxes (user_id, source) where kind = 'gold';

create or replace function public._sync_boxes(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_due int;
  v_have int;
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
  r record;
begin
  perform pg_advisory_xact_lock(hashtext('loot' || p_user::text));
  insert into public.papboy (user_id) values (p_user) on conflict do nothing;

  -- เหล็ก: ทุก 50 XP สะสม
  select (coalesce(sum(xp), 0) / public.loot_value('ironEvery'))::int into v_due from public.xp_events where user_id = p_user;
  select count(*)::int into v_have from public.loot_boxes where user_id = p_user and kind = 'iron';
  if v_due > v_have then
    insert into public.loot_boxes (user_id, kind) select p_user, 'iron' from generate_series(1, v_due - v_have);
  end if;

  -- เงิน: เข้าเรียน 10 คาบ · จดมีรูป 5 · ส่งก่อนกำหนด ≥1 วัน 3 งาน · ทวน 10 ครั้ง
  for r in
    select 'attend' as src, (select count(*) from public.xp_events where user_id = p_user and action = 'attend') / public.loot_value('silverAttend') as due
    union all
    select 'photo', (select count(*) from public.xp_events where user_id = p_user and action = 'notePhoto') / public.loot_value('silverPhoto')
    union all
    select 'early', (select count(*) from public.xp_events x join public.assignments a on a.id = x.ref_id
                     where x.user_id = p_user and x.action = 'submit' and a.due_at - x.created_at >= interval '1 day') / public.loot_value('silverEarly')
    union all
    select 'review', (select count(*) from public.xp_events where user_id = p_user and action = 'review') / public.loot_value('silverReview')
  loop
    select count(*)::int into v_have from public.loot_boxes where user_id = p_user and kind = 'silver' and source = r.src;
    if r.due > v_have then
      insert into public.loot_boxes (user_id, kind, source) select p_user, 'silver', r.src from generate_series(1, r.due::int - v_have);
    end if;
  end loop;

  -- ทอง: บอสประจำเทอมตายวันสอบปลายภาควิชาสุดท้าย (ไม่มีวันสอบ = วันปิดเทอม) ตรงกับ lib/boss.ts · เทอมละ 1 ใบ
  -- shortcut: เทอมต้องสร้างก่อนวันบอสตาย (กันสร้างเทอมย้อนหลังมาเก็บกล่อง) · แก้วันสอบเป็นอดีตยังได้ทองก่อนเวลา — แอปส่วนตัว โกงได้แค่ตัวเอง
  insert into public.loot_boxes (user_id, kind, source)
  select p_user, 'gold', 'boss:' || t.id
  from public.terms t
  cross join lateral (
    select coalesce(max(e.date), t.end_date) as last_day
    from public.exams e join public.subjects s on s.id = e.subject_id
    where s.term_id = t.id and e.kind = 'final'
  ) d
  where t.user_id = p_user and v_today >= d.last_day and (t.created_at at time zone 'Asia/Bangkok')::date < d.last_day
  on conflict (user_id, source) where kind = 'gold' do nothing;
end $$;
revoke execute on function public._sync_boxes(uuid) from public, anon, authenticated;

-- แลกเศษชอล์กเป็นของที่ยังไม่มี (ราคาตามความหายาก)
create or replace function public.craft_item(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_rar text;
  v_cost int;
  v_chalk int;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  select rarity into v_rar from public.items where id = p_item and not is_default;
  if not found then raise exception 'item not craftable'; end if;
  if exists (select 1 from public.user_items where user_id = v_uid and item_id = p_item) then raise exception 'item already owned'; end if;
  v_cost := public.loot_value('craft' || upper(v_rar));
  insert into public.papboy (user_id) values (v_uid) on conflict do nothing;
  select chalk into v_chalk from public.papboy where user_id = v_uid for update;
  if v_chalk < v_cost then raise exception 'not enough chalk'; end if;
  update public.papboy set chalk = chalk - v_cost where user_id = v_uid returning chalk into v_chalk;
  insert into public.user_items (user_id, item_id) values (v_uid, p_item);
  return jsonb_build_object('item_id', p_item, 'chalk', v_chalk);
end $$;
revoke execute on function public.craft_item(text) from public, anon;
grant execute on function public.craft_item(text) to authenticated;
-- RLS: ไม่มีตารางใหม่ · loot_boxes / papboy / user_items ยังเขียนได้เฉพาะผ่านฟังก์ชัน (policy เดิมจากขั้น 7)
