-- ขั้น 7: กล่อง + ของแต่งตัว Pap-Boy · เจ้าของรันเองใน Supabase SQL Editor (หลัง migration ขั้น 1–6)
-- กล่องมาจาก XP จริงเท่านั้น (กล่องเหล็ก 1 ใบต่อ XP สะสมทุก 50) · ไม่มีอะไรให้เพราะเปิดแอป · ไม่มีของหาย
-- สุ่ม / ปลดล็อก / ใส่ของ ทำใน RPC security definer เท่านั้น (แอปเขียนตารางพวกนี้ตรงไม่ได้) → โกงจากเครื่องไม่ได้
-- ค่าต้องตรงกับ LOOT_CONFIG + ITEMS ใน lib/papboy.ts (มีเทสต์ lib/papboy.test.ts เทียบกับไฟล์นี้)
-- ยังไม่ทำ: กล่องเงิน (เป้าย่อย) / กล่องทอง (ล้มบอส) / แลกเศษชอล์ก / ของตามซีซั่น — รอเจ้าของตัดสิน (kind เผื่อไว้แล้ว)

-- ---------- ค่ากล่อง (ที่เดียวฝั่ง DB) ----------
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
  end
$$;

-- ---------- คลังของ (ทุกคนอ่านได้) · is_default = มีตั้งแต่แรก ไม่ดรอป ----------
create table public.items (
  id text primary key, -- "ช่อง.ค่า" เช่น ears.cat
  slot text not null,
  name text not null,
  rarity text not null check (rarity in ('n', 'm', 'r', 'u')),
  is_default boolean not null default false
);
alter table public.items enable row level security;
create policy items_select_all on public.items for select to authenticated using (true);

insert into public.items (id, slot, name, rarity, is_default) values
  ('glow.yellow', 'glow', 'เหลือง', 'n', true),
  ('glow.green', 'glow', 'เขียว', 'n', false),
  ('glow.cyan', 'glow', 'ฟ้าน้ำแข็ง', 'm', false),
  ('glow.pink', 'glow', 'ชมพู', 'r', false),
  ('mouth.smile', 'mouth', 'ยิ้ม', 'n', true),
  ('mouth.cat', 'mouth', 'ปากแมว', 'm', false),
  ('mouth.fang', 'mouth', 'เขี้ยว', 'm', false),
  ('mouth.tongue', 'mouth', 'แลบลิ้น', 'r', false),
  ('eyes.none', 'eyes', 'ไม่ใส่', 'n', true),
  ('eyes.round', 'eyes', 'แว่นกลม', 'm', false),
  ('eyes.hud', 'eyes', 'จอ HUD', 'u', false),
  ('ears.none', 'ears', 'ไม่มี', 'n', true),
  ('ears.cat', 'ears', 'หูแมว', 'm', false),
  ('ears.bunny', 'ears', 'หูกระต่าย', 'r', false),
  ('ears.speaker', 'ears', 'หูลำโพง', 'r', false),
  ('hat.none', 'hat', 'ไม่ใส่', 'n', true),
  ('hat.beanie', 'hat', 'ไหมพรม', 'n', false),
  ('hat.grad', 'hat', 'หมวกบัณฑิต', 'u', false),
  ('outfit.hoodie', 'outfit', 'ฮู้ดส้ม', 'n', true),
  ('outfit.lab', 'outfit', 'เสื้อกาวน์', 'm', false),
  ('outfit.jacket', 'outfit', 'แจ็กเก็ตทอง', 'r', false),
  ('scarf.none', 'scarf', 'ไม่มี', 'n', true),
  ('scarf.red', 'scarf', 'แดงปลิว', 'm', false),
  ('shoes.plain', 'shoes', 'ธรรมดา', 'n', true),
  ('shoes.sneaker', 'shoes', 'ผ้าใบแดง', 'm', false),
  ('shoes.gold', 'shoes', 'บูตทอง', 'r', false),
  ('held.none', 'held', 'มือเปล่า', 'n', true),
  ('held.pencil', 'held', 'ดินสอยักษ์', 'r', false),
  ('held.laser', 'held', 'ปากกาเลเซอร์', 'u', false),
  ('wings.none', 'wings', 'ไม่มี', 'n', true),
  ('wings.paper', 'wings', 'ปีกกระดาษ', 'r', false),
  ('wings.pixel', 'wings', 'ปีกพิกเซล', 'm', false),
  ('wings.light', 'wings', 'ปีกแสง', 'u', false),
  ('back.none', 'back', 'ไม่มี', 'n', true),
  ('back.ring', 'back', 'วงแหวน', 'm', false),
  ('back.flame', 'back', 'เปลวทอง', 'r', false),
  ('back.stars', 'back', 'ดาวหมุน', 'u', false),
  ('ground.none', 'ground', 'ไม่มี', 'n', true),
  ('ground.bloom', 'ground', 'ดอกไม้', 'n', false),
  ('ground.ripple', 'ground', 'คลื่นน้ำ', 'm', false),
  ('ground.rune', 'ground', 'วงเวท', 'r', false),
  ('ground.fire', 'ground', 'ไฟใต้เท้า', 'u', false),
  ('fx.none', 'fx', 'ไม่มี', 'n', true),
  ('fx.spark', 'fx', 'ประกาย', 'm', false),
  ('fx.binary', 'fx', 'เลข 0/1', 'r', false),
  ('pet.none', 'pet', 'ไม่มี', 'n', true),
  ('pet.floppy', 'pet', 'ดิสก์บิน', 'r', false),
  ('bg.plain', 'bg', 'ห้องน้ำเงิน', 'n', true),
  ('bg.stars', 'bg', 'ฟ้ากลางคืน', 'm', false)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, rarity = excluded.rarity, is_default = excluded.is_default;

-- ---------- สถานะตัวละคร: ชุดที่ใส่ · เศษชอล์ก · ตัวนับกันดวงซวย ----------
create table public.papboy (
  user_id uuid primary key references auth.users (id) on delete cascade,
  look jsonb not null default '{}'::jsonb, -- {"ears":"cat",...} ช่องที่ไม่มี = ของพื้นฐาน
  chalk int not null default 0 check (chalk >= 0),
  pity int not null default 0 check (pity >= 0) -- เปิดติดกันกี่กล่องแล้วที่ยังไม่เจอ rare ขึ้นไป
);
alter table public.papboy enable row level security;
create policy papboy_select_own on public.papboy for select to authenticated using (user_id = (select auth.uid()));

create table public.user_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.items (id),
  got_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.user_items enable row level security;
create policy user_items_select_own on public.user_items for select to authenticated using (user_id = (select auth.uid()));

create table public.loot_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('iron', 'silver', 'gold')),
  created_at timestamptz not null default now(),
  opened_at timestamptz, -- null = รอเปิด
  item_id text references public.items (id),
  chalk int not null default 0 -- ได้ซ้ำ → เศษชอล์กที่ได้
);
create index loot_boxes_user_idx on public.loot_boxes (user_id, opened_at);
alter table public.loot_boxes enable row level security;
create policy loot_boxes_select_own on public.loot_boxes for select to authenticated using (user_id = (select auth.uid()));
-- ไม่มี policy insert/update/delete ของ papboy / user_items / loot_boxes → เขียนได้เฉพาะฟังก์ชันด้านล่าง

-- เติมกล่องเหล็กให้ครบตาม XP สะสม · นับเทียบจำนวนกล่องที่มีอยู่ → XP ถูกคืนแล้วได้กลับมาไม่ได้กล่องซ้ำ · ไม่ริบกล่องคืน
create or replace function public._sync_boxes(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_due int;
  v_have int;
begin
  perform pg_advisory_xact_lock(hashtext('loot' || p_user::text));
  insert into public.papboy (user_id) values (p_user) on conflict do nothing;
  select (coalesce(sum(xp), 0) / public.loot_value('ironEvery'))::int into v_due from public.xp_events where user_id = p_user;
  select count(*)::int into v_have from public.loot_boxes where user_id = p_user and kind = 'iron';
  if v_due > v_have then
    insert into public.loot_boxes (user_id, kind) select p_user, 'iron' from generate_series(1, v_due - v_have);
  end if;
end $$;
revoke execute on function public._sync_boxes(uuid) from public, anon, authenticated;

-- หน้าเกม/หน้ากล่อง: ชุด เศษชอล์ก กล่องรอเปิด ของที่มี ของล่าสุด และที่ได้วันนี้ (เวลาไทย)
create or replace function public.loot_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  perform public._sync_boxes(v_uid);
  return (
    select jsonb_build_object(
      'look', p.look, 'chalk', p.chalk, 'pity', p.pity,
      'boxes', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'kind', b.kind) order by b.created_at)
        from public.loot_boxes b where b.user_id = v_uid and b.opened_at is null), '[]'::jsonb),
      'owned', coalesce((select jsonb_agg(u.item_id) from public.user_items u where u.user_id = v_uid), '[]'::jsonb),
      'recent', coalesce((select jsonb_agg(jsonb_build_object('item_id', x.item_id, 'at', x.opened_at, 'chalk', x.chalk) order by x.opened_at desc)
        from (select b.item_id, b.opened_at, b.chalk from public.loot_boxes b
              where b.user_id = v_uid and b.opened_at is not null order by b.opened_at desc limit 5) x), '[]'::jsonb),
      'today_boxes', (select count(*) from public.loot_boxes b
        where b.user_id = v_uid and (b.created_at at time zone 'Asia/Bangkok')::date = v_today),
      'today_items', coalesce((select jsonb_agg(u.item_id) from public.user_items u
        where u.user_id = v_uid and (u.got_at at time zone 'Asia/Bangkok')::date = v_today), '[]'::jsonb)
    )
    from public.papboy p where p.user_id = v_uid
  );
end $$;

-- เปิดกล่อง: สุ่มความหายาก (มีกันดวงซวย) → สุ่มของในสีนั้น → มีแล้ว = เศษชอล์ก
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
  w_n int;
  w_m int;
  w_r int;
  w_u int;
begin
  select kind into v_kind from public.loot_boxes where id = p_box and user_id = v_uid and opened_at is null for update;
  if not found then raise exception 'box not found or already opened'; end if;
  select pity into v_pity from public.papboy where user_id = v_uid for update;
  -- เหล็ก = ทุกสี · เงิน = ฟ้าขึ้นไป · ทอง = เหลืองขึ้นไป · ครบเพดานกันดวงซวย = เหลืองขึ้นไป
  w_n := case when v_kind = 'iron' then public.loot_value('oddsN') else 0 end;
  w_m := case when v_kind = 'gold' then 0 else public.loot_value('oddsM') end;
  w_r := public.loot_value('oddsR');
  w_u := public.loot_value('oddsU');
  if coalesce(v_pity, 0) >= public.loot_value('pity') then w_n := 0; w_m := 0; end if;
  v_roll := random() * (w_n + w_m + w_r + w_u);
  v_rar := case when v_roll < w_n then 'n' when v_roll < w_n + w_m then 'm' when v_roll < w_n + w_m + w_r then 'r' else 'u' end;
  select id into v_item from public.items where rarity = v_rar and not is_default order by random() limit 1;
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

-- ใส่/ถอดของ: ได้เฉพาะของพื้นฐานหรือของที่มีแล้ว
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
      and (i.is_default or exists (select 1 from public.user_items u where u.user_id = v_uid and u.item_id = i.id))
  ) then
    raise exception 'item not owned';
  end if;
  insert into public.papboy (user_id, look) values (v_uid, jsonb_build_object(p_slot, p_value))
  on conflict (user_id) do update set look = public.papboy.look || jsonb_build_object(p_slot, p_value)
  returning look into v_look;
  return v_look;
end $$;

revoke execute on function public.loot_state() from public, anon;
revoke execute on function public.open_box(uuid) from public, anon;
revoke execute on function public.equip_item(text, text) from public, anon;
grant execute on function public.loot_state() to authenticated;
grant execute on function public.open_box(uuid) to authenticated;
grant execute on function public.equip_item(text, text) to authenticated;
