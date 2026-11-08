-- ขั้น 9b: อาวุธแยกคลาส (docs/mockups/b10-class-skills.html · กติกาใน docs/LOOT_PLAN.md) · มีผลแค่หน้าตา
-- เจ้าของรันเองใน Supabase SQL Editor (หลัง 20261118090000_stage9_classes.sql) · รันซ้ำได้
-- RLS: ไม่มีตารางใหม่ · items ยังอ่านได้ตาม policy items_select_all เดิม เขียนได้เฉพาะผ่าน migration · papboy / user_items เขียนผ่านฟังก์ชันด้านล่างเท่านั้น

alter table public.items add column if not exists class_id text; -- null = ของทั่วไป ทุกคลาสได้

insert into public.items (id, slot, name, rarity, is_default, class_id) values
  ('held.pen', 'held', 'ปากกาลูกลื่น', 'n', false, 'scribe'),
  ('held.whiteout', 'held', 'ลิควิดก้นขวด', 'n', false, 'scribe'),
  ('held.stamp', 'held', 'ตรายางแดง', 'm', false, 'scribe'),
  ('held.pencil', 'held', 'ดินสอยักษ์', 'r', false, 'scribe'),
  ('held.laser', 'held', 'ปากกาเลเซอร์', 'u', false, 'scribe'),
  ('held.hand', 'held', 'เข็มนาฬิกาหัก', 'n', false, 'deadline'),
  ('held.rubber', 'held', 'หนังยางมัดงาน', 'n', false, 'deadline'),
  ('held.calendar', 'held', 'ปฏิทินฉีก', 'm', false, 'deadline'),
  ('held.stapler', 'held', 'ปืนแม็กเย็บ', 'r', false, 'deadline'),
  ('held.alarm', 'held', 'นาฬิกาปลุกเถื่อน', 'u', false, 'deadline'),
  ('held.eraser', 'held', 'แปรงลบกระดาน', 'n', false, 'survivor'),
  ('held.bottle', 'held', 'กระติกน้ำบุบ', 'n', false, 'survivor'),
  ('held.whistle', 'held', 'นกหวีดหัวหน้าห้อง', 'm', false, 'survivor'),
  ('held.torch', 'held', 'ไฟฉายเก่า', 'r', false, 'survivor'),
  ('held.bell', 'held', 'กระดิ่งหน้าห้อง', 'u', false, 'survivor'),
  ('held.card', 'held', 'บัตรคำขาด ๆ', 'n', false, 'necro'),
  ('held.highlighter', 'held', 'ไฮไลต์หมึกแห้ง', 'n', false, 'necro'),
  ('held.sticky', 'held', 'โน้ตแปะหลอน', 'm', false, 'necro'),
  ('held.ruler', 'held', 'ไม้บรรทัดปลุกผี', 'r', false, 'necro'),
  ('held.sheet', 'held', 'ชีตเก่าคืนชีพ', 'u', false, 'necro')
on conflict (id) do update set slot = excluded.slot, name = excluded.name, rarity = excluded.rarity, is_default = excluded.is_default, class_id = excluded.class_id;

-- คลาสของเทอมปัจจุบัน (null = ยังไม่เลือก)
create or replace function public._my_class(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select c.class_id from public.term_classes c join public.terms t on t.id = c.term_id where c.user_id = p_user and t.is_current
$$;
revoke execute on function public._my_class(uuid) from public, anon, authenticated;

-- เปิดกล่อง: สุ่มความหายากเหมือนเดิม → 1 ใน 3 ได้อาวุธคลาสตัวเองในความหายากนั้น ที่เหลือเป็นของทั่วไป → มีแล้ว = เศษชอล์ก
create or replace function public.open_box(p_box uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_pity int;
  v_roll numeric;
  v_rar text;
  v_item text;
  v_dup int := 0;
  v_class text;
  w_n int;
  w_m int;
  w_r int;
  w_u int;
begin
  select kind into v_kind from public.loot_boxes where id = p_box and user_id = v_uid and opened_at is null for update;
  if not found then raise exception 'box not found or already opened'; end if;
  select pity into v_pity from public.papboy where user_id = v_uid for update;
  w_n := case when v_kind = 'iron' then public.loot_value('oddsN') else 0 end;
  w_m := case when v_kind = 'gold' then 0 else public.loot_value('oddsM') end;
  w_r := public.loot_value('oddsR');
  w_u := public.loot_value('oddsU');
  if coalesce(v_pity, 0) >= public.loot_value('pity') then w_n := 0; w_m := 0; end if;
  v_roll := random() * (w_n + w_m + w_r + w_u);
  v_rar := case when v_roll < w_n then 'n' when v_roll < w_n + w_m then 'm' when v_roll < w_n + w_m + w_r then 'r' else 'u' end;
  v_class := public._my_class(v_uid);
  if v_class is not null and random() < 1.0 / 3 then
    select id into v_item from public.items where rarity = v_rar and class_id = v_class and not is_default order by random() limit 1;
  end if;
  if v_item is null then
    select id into v_item from public.items where rarity = v_rar and class_id is null and not is_default order by random() limit 1;
  end if;
  if exists (select 1 from public.user_items where user_id = v_uid and item_id = v_item) then
    v_dup := public.loot_value('dup' || upper(v_rar));
  else
    insert into public.user_items (user_id, item_id) values (v_uid, v_item);
  end if;
  update public.papboy
    set chalk = chalk + v_dup, pity = case when v_rar in ('r', 'u') then 0 else pity + 1 end
    where user_id = v_uid;
  update public.loot_boxes set opened_at = now(), item_id = v_item, chalk = v_dup where id = p_box;
  return jsonb_build_object('item_id', v_item, 'rarity', v_rar, 'chalk', v_dup);
end $$;

-- ใส่/ถอด: ของพื้นฐานหรือของที่มีแล้ว · อาวุธใส่ได้เฉพาะตอนเป็นคลาสนั้น
create or replace function public.equip_item(p_slot text, p_value text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_look jsonb;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not exists (
    select 1 from public.items i
    where i.id = p_slot || '.' || p_value and i.slot = p_slot
      and (i.class_id is null or i.class_id = public._my_class(v_uid))
      and (i.is_default or exists (select 1 from public.user_items u where u.user_id = v_uid and u.item_id = i.id))
  ) then
    raise exception 'item not owned';
  end if;
  insert into public.papboy (user_id, look) values (v_uid, jsonb_build_object(p_slot, p_value))
  on conflict (user_id) do update set look = public.papboy.look || jsonb_build_object(p_slot, p_value)
  returning look into v_look;
  return v_look;
end $$;

-- แลกเศษชอล์ก: อาวุธแลกได้เฉพาะคลาสตัวเอง
create or replace function public.craft_item(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_rar text;
  v_cost int;
  v_chalk int;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  select rarity into v_rar from public.items
    where id = p_item and not is_default and (class_id is null or class_id = public._my_class(v_uid));
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
