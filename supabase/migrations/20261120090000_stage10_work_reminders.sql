-- ขั้น 10: ตามงานแบบไล่ระดับ (ยิ่งใกล้ส่งยิ่งถี่ยิ่งดุ) + คลังคำปั่น ๆ · เจ้าของรันเองใน SQL Editor
-- รอบ: เช้า ภาพรวม · เที่ยง · เย็น ทุกงานที่ค้าง · 21:00 · ก่อนหมดเวลา 3 ชม./1 ชม. (ใน send_due_reminders)
-- งานไม่มีวันส่ง = ถือว่าส่งคาบแรกหลังงานเข้าแอป · คำนวณตอนเตือนเท่านั้น ห้ามเขียนลง due_at (Classroom จะล้าง และใช้คิด XP)
-- เทสต์: supabase/tests/stage10_work_reminders.sql

-- ---------- คลังคำ (เพิ่ม/แก้แถวได้เลย ไม่ต้อง deploy · ตัวแปร {งาน} {วิชา} {n} {วัน}) ----------
create table public.push_lines (
  id int generated always as identity primary key,
  pile text not null check (pile in ('chill','nudge','tease','stern','today','h3','h1','late','clear','free','review')),
  body text not null check (char_length(body) between 1 and 160),
  enabled boolean not null default true
);
alter table public.push_lines enable row level security;
-- ใช้จากฟังก์ชัน cron เท่านั้น แอปไม่ต้องอ่าน
create policy push_lines_no_client on public.push_lines for all to anon, authenticated using (false) with check (false);

alter table public.notifications
  add column line_id int references public.push_lines (id) on delete set null, -- ไว้เลือกคำไม่ซ้ำของเดิม
  add column covers uuid[];                                                    -- งานที่เตือนก่อนหมดเวลาไปแล้ว

-- ---------- ตัวช่วย ----------
-- ยิ่งใกล้ส่งยิ่งถี่: เย็นได้ทุกงาน · เช้า เหลือ ≤ 5 วัน · 21:00 เหลือ 1–3 วัน · เที่ยง เหลือ ≤ 1 วัน
create function public._round_has(p_round text, p_days int) returns boolean
language sql immutable as $$
  select case
    when p_round = 'evening' then true
    when p_days is null then false
    when p_round = 'morning' then p_days between 0 and 5
    when p_round = 'noon' then p_days between 0 and 1
    when p_round = 'night' then p_days between 1 and 3
    else false
  end
$$;

create function public._work_pile(p_days int) returns text
language sql immutable as $$
  select case
    when p_days is null or p_days >= 6 then 'chill'
    when p_days >= 4 then 'nudge'
    when p_days >= 2 then 'tease'
    when p_days = 1 then 'stern'
    when p_days = 0 then 'today'
    else 'late'
  end
$$;

create function public._when_text(p_days int) returns text
language sql immutable as $$
  select case
    when p_days is null then 'ยังไม่มีกำหนด'
    when p_days = 0 then 'วันนี้'
    when p_days = 1 then 'พรุ่งนี้'
    when p_days > 1 then 'อีก ' || p_days || ' วัน'
    else 'เลยกำหนด ' || -p_days || ' วัน'
  end
$$;

-- คาบแรกของวิชาหลังเวลาที่งานเข้าแอป · ตรึงจาก created_at งานจึงไม่เลื่อนไปเรื่อย ๆ · ข้ามคาบที่งดสอน
create function public._assumed_due(p_user uuid, p_subject uuid, p_after timestamptz) returns timestamptz
language sql stable security definer set search_path = public as $$
  select min((d::date + cs.start_time) at time zone 'Asia/Bangkok')
  from public.class_slots cs
  join public.subjects s on s.id = cs.subject_id
  join public.terms t on t.id = s.term_id
  cross join generate_series((p_after at time zone 'Asia/Bangkok')::date, (p_after at time zone 'Asia/Bangkok')::date + 20, interval '1 day') d
  where cs.user_id = p_user and cs.subject_id = p_subject
    and d::date between t.start_date and t.end_date
    and (cs.makeup_date = d::date or (cs.makeup_date is null and cs.weekday = extract(dow from d)))
    and (d::date + cs.start_time) at time zone 'Asia/Bangkok' > p_after
    and not exists (select 1 from public.attendance a where a.user_id = p_user and a.slot_id = cs.id and a.date = d::date and a.status = 'no_class')
$$;

-- งานที่ต้องส่งและยังไม่ติ๊ก (ของตัวเอง + ห้องที่อยู่) · ชื่อวิชาแสดงเฉพาะวิชาของผู้รับ
create function public._pending_work(p_user uuid, p_now timestamptz)
returns table (work_id uuid, work_title text, subject_name text, due timestamptz, days int, assumed boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.title, s.name, x.due,
         (x.due at time zone 'Asia/Bangkok')::date - (p_now at time zone 'Asia/Bangkok')::date,
         a.due_at is null and x.due is not null
  from public.assignments a
  left join public.subjects s on s.id = a.subject_id and s.user_id = p_user
  cross join lateral (select coalesce(a.due_at, public._assumed_due(p_user, a.subject_id, a.created_at)) as due) x
  where ((a.created_by = p_user and a.room_id is null)
         or a.room_id in (select m.room_id from public.room_members m where m.user_id = p_user))
    and not exists (select 1 from public.assignment_status st where st.assignment_id = a.id and st.user_id = p_user and st.done)
$$;

-- สุ่มจากกอง โดยเลี่ยงคำที่ผู้ใช้เพิ่งได้ 6 ครั้งล่าสุด (กองเล็กกว่านั้นถึงจะวนซ้ำ)
create function public._pick_line(p_user uuid, p_pile text) returns public.push_lines
language sql volatile security definer set search_path = public as $$
  select l.* from public.push_lines l
  where l.pile = p_pile and l.enabled
  order by l.id = any (array(select n.line_id from public.notifications n
                             where n.user_id = p_user and n.line_id is not null
                             order by n.created_at desc limit 6)), random()
  limit 1
$$;

create function public._fill_line(p_body text, p_work text, p_subject text, p_n int, p_when text) returns text
language sql immutable as $$
  select replace(replace(replace(replace(coalesce(p_body, ''),
    '{งาน}', coalesce(p_work, 'งาน')), '{วิชา}', coalesce(p_subject, 'วิชานี้')), '{n}', coalesce(p_n, 0)::text), '{วัน}', coalesce(p_when, ''))
$$;

revoke execute on function public._assumed_due(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public._pending_work(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public._pick_line(uuid, text) from public, anon, authenticated;

-- ---------- รอบเตือนประจำวัน · รวมทุกงานเป็นข้อความเดียว · ref ต่อวันกันเด้งซ้ำ ----------
create function public.send_work_round(p_round text, p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (p_now at time zone 'Asia/Bangkok')::date;
  u uuid;
  v_all int; v_round int; v_review int; v_in_term boolean; v_classes text;
  v_title text; v_lead text; v_pile text; v_when text; v_url text;
  top record;
  v_line public.push_lines;
begin
  for u in select distinct ps.user_id from public.push_subscriptions ps loop
    begin -- คนหนึ่งพังต้องไม่ทำให้คนอื่นไม่ได้เตือน
      top := null; v_lead := ''; v_url := '/tasks';
      select count(*), count(*) filter (where public._round_has(p_round, p.days))
        into v_all, v_round from public._pending_work(u, p_now) p;
      select p.* into top from public._pending_work(u, p_now) p
        order by public._round_has(p_round, p.days) desc, p.due nulls last limit 1;
      v_when := case when top.work_id is null then null
                     when top.assumed and top.days >= 0 then 'คาบถัดไป ' || public._when_text(top.days)
                     else public._when_text(top.days) end;
      v_pile := public._work_pile(top.days);

      select exists (select 1 from public.terms t where t.user_id = u and t.is_current and v_today between t.start_date and t.end_date)
        into v_in_term;
      select string_agg(x.name, ', ') into v_classes from (
        select s.name, min(cs.start_time) as t
        from public.class_slots cs
        join public.subjects s on s.id = cs.subject_id
        join public.terms te on te.id = s.term_id and te.is_current and v_today between te.start_date and te.end_date
        where cs.user_id = u
          and (cs.makeup_date = v_today or (cs.makeup_date is null and cs.weekday = extract(dow from v_today)))
          and not exists (select 1 from public.attendance a where a.user_id = u and a.slot_id = cs.id and a.date = v_today and a.status = 'no_class')
        group by s.name order by t
      ) x;

      if p_round = 'morning' then
        select count(*) into v_review from public.topics t
          join public.subjects s on s.id = t.subject_id
          join public.terms te on te.id = s.term_id and te.is_current
          where t.user_id = u and (t.review_stage = 0 or t.next_review_at is null or t.next_review_at <= p_now);
        if v_all = 0 and not v_in_term then continue; end if;
        if v_all > 0 and v_round = 0 and v_classes is null and v_review = 0 then continue; end if; -- งานยังไกล วันนี้ไม่มีอะไร รอรอบเย็น
        if v_all = 0 then v_pile := case when v_review > 0 then 'review' else 'free' end; end if;
        v_title := array_to_string(array_remove(array[
          case when v_classes is not null then 'วันนี้เรียน ' || v_classes end,
          case when v_all > 0 then 'ค้าง ' || v_all || ' งาน' end,
          case when v_review > 0 then 'ทวน ' || v_review || ' หัวข้อ' end
        ], null), ' · ');
        if v_title = '' then v_title := 'วันนี้ไม่มีเรียน ไม่มีงานค้าง'; end if;
        if top.work_id is not null then v_lead := 'ใกล้สุดคือ ' || top.work_title || ' (' || v_when || ') · '; end if;
        if v_all = 0 then v_url := '/today'; end if;
      elsif p_round = 'evening' and v_all = 0 then
        if v_classes is null and not exists (
          select 1 from public.assignment_status st
          where st.user_id = u and st.done and (st.submitted_at at time zone 'Asia/Bangkok')::date = v_today
        ) then continue; end if; -- ไม่มีคาบ ไม่มีงาน ไม่ต้องชม
        v_pile := 'clear';
        v_title := 'วันนี้งานเคลียร์หมดแล้ว';
      else
        if v_round = 0 then continue; end if;
        v_title := case when v_round = 1 then top.work_title || ' · ' || v_when
                        else 'ค้าง ' || v_round || ' งาน · ด่วนสุด ' || top.work_title || ' (' || v_when || ')' end;
      end if;

      v_line := public._pick_line(u, v_pile);
      insert into public.notifications (user_id, title, body, url, ref, line_id, created_at)
      values (u, left(v_title, 120),
              v_lead || public._fill_line(v_line.body, top.work_title, top.subject_name, v_round, v_when),
              v_url, p_round || ':' || v_today, v_line.id, p_now)
      on conflict (user_id, ref) do nothing;
    exception when others then
      raise warning 'send_work_round % user %: %', p_round, u, sqlerrm;
    end;
  end loop;
end $$;
revoke execute on function public.send_work_round(text, timestamptz) from public, anon, authenticated;

-- ---------- ก่อนหมดเวลา 3 ชม. / 1 ชม. (เรียกจาก send_due_reminders ทุก 5 นาที) ----------
create function public._send_countdowns(p_now timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare
  u uuid;
  st record;
  v_ids uuid[]; v_n int; v_work text; v_subject text;
  v_line public.push_lines;
begin
  for u in select distinct ps.user_id from public.push_subscriptions ps loop
    begin
      for st in select * from (values ('h1', 1, interval '0 hours', interval '1 hour'),
                                      ('h3', 3, interval '1 hour', interval '3 hours')) as t(pile, hours, lo, hi) loop
        select array_agg(p.work_id order by p.work_id), count(*),
               (array_agg(p.work_title order by p.due))[1], (array_agg(p.subject_name order by p.due))[1]
          into v_ids, v_n, v_work, v_subject
        from public._pending_work(u, p_now) p
        where p.due > p_now + st.lo and p.due <= p_now + st.hi
          and not exists (select 1 from public.notifications n
                          where n.user_id = u and n.ref like st.pile || ':%' and p.work_id = any (n.covers));
        if v_n > 0 then
          v_line := public._pick_line(u, st.pile);
          insert into public.notifications (user_id, title, body, url, ref, line_id, covers, created_at)
          values (u, left(case when v_n = 1 then v_work else v_n || ' งาน' end || ' · เหลือไม่ถึง ' || st.hours || ' ชม.', 120),
                  public._fill_line(v_line.body, v_work, v_subject, v_n::int, 'เหลือไม่ถึง ' || st.hours || ' ชม.'),
                  '/tasks', st.pile || ':' || md5(array_to_string(v_ids, ',')), v_line.id, v_ids, p_now)
          on conflict (user_id, ref) do nothing;
        end if;
      end loop;
    exception when others then
      raise warning '_send_countdowns user %: %', u, sqlerrm;
    end;
  end loop;
end $$;
revoke execute on function public._send_countdowns(timestamptz) from public, anon, authenticated;

-- ---------- เดิม: เตือนหลังเลิกคาบ · "ใกล้ส่ง" ครั้งเดียว เปลี่ยนเป็นบันไดด้านบน ----------
create or replace function public.send_due_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare
  now_bkk timestamp := now() at time zone 'Asia/Bangkok';
  today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  insert into public.notifications (user_id, title, body, url, ref)
  select cs.user_id, 'คาบ ' || s.name || ' จบแล้ว', 'อาจารย์สั่งงานไหม? จดไว้เลย ถ่ายรูปกระดานได้ด้วย',
         '/note/' || cs.id || '?date=' || today, 'note:' || cs.id || ':' || today
  from public.class_slots cs
  join public.subjects s on s.id = cs.subject_id
  join public.terms t on t.id = s.term_id and t.is_current and today between t.start_date and t.end_date
  join public.profiles p on p.id = cs.user_id
  where (cs.makeup_date = today or (cs.makeup_date is null and cs.weekday = extract(dow from today)))
    and exists (select 1 from public.push_subscriptions ps where ps.user_id = cs.user_id)
    and (today + cs.end_time + make_interval(mins => p.remind_after_class_min)) between now_bkk - interval '30 minutes' and now_bkk
    and not exists (select 1 from public.class_notes n where n.user_id = cs.user_id and n.slot_id = cs.id and n.date = today)
    and not exists (select 1 from public.attendance a where a.user_id = cs.user_id and a.slot_id = cs.id and a.date = today and a.status = 'no_class')
  on conflict (user_id, ref) do nothing;

  perform public._send_countdowns(now());

  delete from public.notifications where created_at < now() - interval '14 days';
end $$;

-- ---------- cron (เวลา UTC · :10 เพื่อให้รอบดึง Classroom นาที :07 ติ๊กงานที่เพิ่งส่งก่อน) ----------
select cron.schedule('work-morning', '10 0 * * *',  $$select public.send_work_round('morning')$$); -- 07:10 ไทย
select cron.schedule('work-noon',    '10 5 * * *',  $$select public.send_work_round('noon')$$);    -- 12:10 ไทย
select cron.schedule('work-evening', '10 12 * * *', $$select public.send_work_round('evening')$$); -- 19:10 ไทย
select cron.schedule('work-night',   '10 14 * * *', $$select public.send_work_round('night')$$);   -- 21:10 ไทย

-- ---------- คำเริ่มต้น ----------
insert into public.push_lines (pile, body) values
  ('chill', '{งาน} ยังนอนรออยู่นะ ไม่รีบ แต่รออยู่'),
  ('chill', 'เราเฝ้า {งาน} ให้อยู่ มันยังไม่หนีไปไหน'),
  ('chill', 'แมงมุมถามถึง {งาน} เราบอกว่าเดี๋ยวนายมาทำ'),
  ('chill', 'ยังมีเวลา โลกยังไม่แตกรอบสอง'),
  ('chill', 'เริ่มนิดเดียวก็ได้ เรานับว่าขยันแล้ว'),
  ('chill', 'วิทยุบอกว่าอากาศดี เหมาะกับการเปิดไฟล์ {งาน}'),

  ('nudge', '{งาน} เริ่มมองนายแปลก ๆ แล้วนะ'),
  ('nudge', 'เปิดไฟล์ก่อนก็ได้ ไม่ต้องทำก็ได้ แต่เปิดก่อน'),
  ('nudge', 'ไม่ได้กดดันนะ แค่นับให้ฟัง: {วัน}'),
  ('nudge', 'ซอมบี้เริ่มเดินมาทางคณะแล้ว ช้า ๆ เหมือนนายเลย'),
  ('nudge', 'เราเตรียมกาแฟหมดอายุไว้แล้ว มาทำ {งาน} กัน'),
  ('nudge', 'งานไม่ทำตัวเองนะ เราลองคุยกับมันแล้ว'),

  ('tease', 'วิทยุจับสัญญาณได้ว่า {งาน} ยังไม่ส่ง'),
  ('tease', 'ไม่เป็นไรหรอก เราชินแล้วที่รออยู่บนซากตึก'),
  ('tease', 'งาน{วิชา} {วัน} นะ เผื่อลืม เราไม่ลืม'),
  ('tease', 'แมงมุมทำเสร็จแล้ว ส่วนนายล่ะ'),
  ('tease', 'เราไม่ได้งอน แค่ไม่คุยจนกว่าจะส่ง {งาน}'),
  ('tease', 'งอนแล้วนะ {งาน} ยังไม่แตะเลย'),

  ('stern', 'พรุ่งนี้แล้วนะ เรายังเชื่อในตัวนายอยู่ น้อยลงแล้ว'),
  ('stern', 'คืนนี้หรือไม่มีคืนไหนแล้ว {งาน} รอนายอยู่'),
  ('stern', 'วางมือถือ เปิด {งาน} นี่ไม่ใช่คำขอ'),
  ('stern', 'ซีรีส์รอได้ {งาน} รอไม่ได้'),
  ('stern', 'เลิกงอนแล้ว ดุแทน ไปทำ {งาน}'),
  ('stern', 'โลกแตกยังไม่น่ากลัวเท่าส่ง {งาน} ไม่ทัน'),

  ('today', 'วันนี้ส่ง เลิกไถฟีดแล้วไปทำ'),
  ('today', 'ไม่มีพรุ่งนี้สำหรับ {งาน} แล้ว'),
  ('today', 'เปิดไฟล์เดี๋ยวนี้ เราไม่ล้อเล่นรอบนี้'),
  ('today', 'ทุกนาทีที่อ่านข้อความนี้คือนาทีที่ไม่ได้ทำ {งาน}'),
  ('today', 'อารยธรรมล่มไปแล้ว งานยังอยู่ครบ ส่งวันนี้'),
  ('today', 'วันสุดท้าย เราจะยืนมองจนกว่านายจะส่ง'),

  ('h3', 'ซอมบี้ยังพิมพ์เร็วกว่านี้'),
  ('h3', 'ปิดทุกอย่างที่ไม่ใช่ {งาน}'),
  ('h3', 'ไม่มีเวลางอนแล้ว ทำก่อน'),
  ('h3', 'กาแฟหมดอายุยังกินได้ เวลาหมดอายุกินไม่ได้'),
  ('h3', 'เราไม่พูดเล่นแล้ว เปิด {งาน}'),

  ('h1', 'ชั่วโมงสุดท้าย เปิดไฟล์เดี๋ยวนี้'),
  ('h1', 'นี่คือข้อความสุดท้ายก่อนสัญญาณดับ'),
  ('h1', 'ส่งแบบไม่สวยยังดีกว่าไม่ส่ง ไปเลย'),
  ('h1', 'หยุดอ่านแล้วไปกดส่ง'),
  ('h1', 'วิทยุจะดับแล้ว {งาน} ล่ะ'),

  ('late', 'เลยมาแล้ว อาจารย์ยังรับไหมก็ไปถามดู'),
  ('late', '{งาน} เลยกำหนดแล้ว แต่ส่งช้ายังดีกว่าไม่ส่ง'),
  ('late', 'เรายังไม่เลิกทวงนะ เรามีเวลาเหลือเฟือบนซากตึกนี้'),
  ('late', 'ถ้าส่งไปแล้วก็มาติ๊กให้เราหน่อย'),
  ('late', 'จดหมายถึง {งาน}: ขอโทษที่มาช้า ส่งเถอะ'),
  ('late', 'ผิดหวังนิดนึง แต่ยังรอ'),

  ('clear', 'มนุษยชาติยังมีหวัง นิดเดียว'),
  ('clear', 'งานหมดแล้ว เรายกโทษให้เรื่องเมื่อวาน'),
  ('clear', 'เคลียร์หมด แมงมุมปรบมือแปดขา'),
  ('clear', 'วันนี้โลกแตกช้าลงนิดนึง เพราะนาย'),
  ('clear', 'ไม่มีอะไรให้ทวงแล้ว เราเหงานิดหน่อย'),
  ('clear', 'เก่งมาก ไปนอนได้ ซอมบี้เฝ้าให้'),

  ('free', 'วันนี้ว่าง เราตรวจซากตึกให้แล้ว ปลอดงาน'),
  ('free', 'ปลอดงานในรัศมี 5 กิโล ไปหาอะไรกิน'),
  ('free', 'ไม่มีอะไรให้ทวง เราเลยนั่งนับแมงมุม'),
  ('free', 'วันนี้โล่งจนน่ากลัว ใช้ให้คุ้ม'),
  ('free', 'วันดี ๆ แบบนี้หายากกว่ากระป๋องที่ยังไม่บุบ'),

  ('review', 'หัวข้อเก่าเริ่มจางแล้ว มาทวนก่อนมันหายไปกับอารยธรรม'),
  ('review', 'ความรู้ก็หมดอายุได้นะ ทวนแป๊บเดียว'),
  ('review', 'ความจำส่งสัญญาณขอความช่วยเหลือ ถึงรอบทวนแล้ว'),
  ('review', 'ทวนวันนี้ สอบจะน่ากลัวน้อยลงนิดนึง'),
  ('review', 'เราจดไว้ให้แล้วว่าต้องทวนอะไร เหลือแค่นายมาอ่าน');
