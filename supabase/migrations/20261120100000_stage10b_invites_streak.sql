-- ขั้น 10b: ข้อความชวนกลับแบบงอน + ข้อความพิเศษ (ศุกร์เย็น ใกล้สอบ) + streak สะสมรายสัปดาห์ · รันต่อจาก stage10
-- ไม่เพิ่มจำนวนรอบ: เปลี่ยนแค่เนื้อความในรอบเดิม และไม่ทับตอนงานด่วน (เหลือ ≤ 1 วัน หรือเลยกำหนด)
-- streak นับสะสม ไม่รีเซ็ต · ไม่ให้ XP · ยังไม่มีหน้าจอแสดง (ต้องทำ mockup ก่อน)
-- ตารางใหม่ไม่มี · push_lines มี RLS แล้วใน stage10 · เทสต์: supabase/tests/stage10_work_reminders.sql

alter table public.push_lines drop constraint push_lines_pile_check;
alter table public.push_lines add constraint push_lines_pile_check check (pile in (
  'chill','nudge','tease','stern','today','h3','h1','late','clear','free','review',
  'miss2','miss3','miss5','miss7','giveup','back','unchecked','friday','exam','streak'
));

-- หายไปกี่วัน → งอนระดับไหน · 10 วัน = ยอมแพ้ครั้งเดียว · เกินนั้นเลิกชวน (การตามงานยังทำต่อ)
create function public._miss_pile(p_absent int) returns text
language sql immutable as $$
  select case
    when p_absent is null or p_absent < 2 or p_absent > 10 then null
    when p_absent = 10 then 'giveup'
    when p_absent >= 7 then 'miss7'
    when p_absent >= 5 then 'miss5'
    when p_absent >= 3 then 'miss3'
    else 'miss2'
  end
$$;

-- วันที่ผู้ใช้ทำอะไรจริง (เช็กชื่อ จด ส่งงาน ทวน) · การเปิดแอปไม่นับ
create function public._active_dates(p_user uuid, p_today date) returns setof date
language sql stable security definer set search_path = public as $$
  select d from (
    select (updated_at at time zone 'Asia/Bangkok')::date d from public.attendance where user_id = p_user
    union select (updated_at at time zone 'Asia/Bangkok')::date from public.class_notes where user_id = p_user
    union select (submitted_at at time zone 'Asia/Bangkok')::date from public.assignment_status where user_id = p_user and done and submitted_at is not null
    union select (last_reviewed_at at time zone 'Asia/Bangkok')::date from public.topics where user_id = p_user and last_reviewed_at is not null
  ) x where d <= p_today
$$;

-- สัปดาห์ จ–อา ทำครบไหม: เช็กชื่อครบทุกคาบ (สถานะใดก็ได้) + งานที่มี due_at จริงติ๊กครบ · ไม่มีคาบและงานเลย = null (ไม่นับ)
create function public._week_complete(p_user uuid, p_monday date) returns boolean
language sql stable security definer set search_path = public as $$
  with sess as (
    select cs.id, d::date as day
    from generate_series(p_monday, p_monday + 6, interval '1 day') d
    join public.class_slots cs on cs.user_id = p_user
      and (cs.makeup_date = d::date or (cs.makeup_date is null and cs.weekday = extract(dow from d)))
    join public.subjects s on s.id = cs.subject_id
    join public.terms t on t.id = s.term_id and d::date between t.start_date and t.end_date
  ), work as (
    select a.id from public.assignments a
    where ((a.created_by = p_user and a.room_id is null)
           or a.room_id in (select m.room_id from public.room_members m where m.user_id = p_user))
      and (a.due_at at time zone 'Asia/Bangkok')::date between p_monday and p_monday + 6
  )
  select case
    when not exists (select 1 from sess) and not exists (select 1 from work) then null
    else not exists (select 1 from sess x where not exists (
           select 1 from public.attendance a where a.user_id = p_user and a.slot_id = x.id and a.date = x.day))
     and not exists (select 1 from work w where not exists (
           select 1 from public.assignment_status st where st.user_id = p_user and st.assignment_id = w.id and st.done))
  end
$$;

-- จำนวนสัปดาห์ที่ทำครบสะสม (ก่อนสัปดาห์ปัจจุบัน)
create function public._week_streak(p_user uuid, p_today date) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from generate_series(
    date_trunc('week', (select min(start_date) from public.terms where user_id = p_user)),
    date_trunc('week', p_today) - interval '7 days', interval '7 days') w
  where public._week_complete(p_user, w::date)
$$;

revoke execute on function public._active_dates(uuid, date) from public, anon, authenticated;
revoke execute on function public._week_complete(uuid, date) from public, anon, authenticated;
revoke execute on function public._week_streak(uuid, date) from public, anon, authenticated;

create or replace function public.send_work_round(p_round text, p_now timestamptz default now()) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_today date := (p_now at time zone 'Asia/Bangkok')::date;
  u uuid;
  v_all int; v_round int; v_review int; v_in_term boolean; v_classes text; v_unchecked int;
  v_title text; v_lead text; v_pile text; v_when text; v_url text;
  v_absent int; v_back boolean; v_calm boolean; v_miss text; v_exam text; v_streak int; v_n int;
  top record;
  v_line public.push_lines;
begin
  for u in select distinct ps.user_id from public.push_subscriptions ps loop
    begin -- คนหนึ่งพังต้องไม่ทำให้คนอื่นไม่ได้เตือน
      top := null; v_lead := ''; v_url := '/tasks'; v_exam := null; v_streak := 0;
      select count(*), count(*) filter (where public._round_has(p_round, p.days))
        into v_all, v_round from public._pending_work(u, p_now) p;
      v_n := v_round;
      select p.* into top from public._pending_work(u, p_now) p
        order by public._round_has(p_round, p.days) desc, p.due nulls last limit 1;
      v_when := case when top.work_id is null then null
                     when top.assumed and top.days >= 0 then 'คาบถัดไป ' || public._when_text(top.days)
                     else public._when_text(top.days) end;
      v_pile := public._work_pile(top.days);
      v_calm := top.work_id is null or top.days is null or top.days >= 2; -- งานด่วนต้องดุตามบันได ไม่เอามุกอื่นมาทับ

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
      select count(*) into v_review from public.topics t
        join public.subjects s on s.id = t.subject_id
        join public.terms te on te.id = s.term_id and te.is_current
        where t.user_id = u and (t.review_stage = 0 or t.next_review_at is null or t.next_review_at <= p_now);

      if p_round = 'morning' then
        select 'สอบ ' || s.name || ' ' || public._when_text(e.date - v_today) into v_exam
          from public.exams e join public.subjects s on s.id = e.subject_id
          where e.user_id = u and e.date between v_today and v_today + 7
          order by e.date limit 1;
        if extract(isodow from v_today) = 1 and public._week_complete(u, v_today - 7) then
          v_streak := public._week_streak(u, v_today);
        end if;
        if v_all = 0 and not v_in_term then continue; end if;
        if v_all > 0 and v_round = 0 and v_classes is null and v_review = 0 and v_exam is null and v_streak = 0 then continue; end if; -- งานยังไกล รอรอบเย็น
        if v_all = 0 then v_pile := case when v_review > 0 then 'review' else 'free' end; end if;
        if v_calm and v_exam is not null then v_pile := 'exam';
        elsif v_calm and v_streak > 0 then v_pile := 'streak'; v_n := v_streak;
        end if;
        v_title := array_to_string(array_remove(array[
          case when v_classes is not null then 'วันนี้เรียน ' || v_classes end,
          case when v_all > 0 then 'ค้าง ' || v_all || ' งาน' end,
          v_exam,
          case when v_review > 0 then 'ทวน ' || v_review || ' หัวข้อ' end,
          case when v_streak > 0 then 'ทำครบ ' || v_streak || ' สัปดาห์แล้ว' end
        ], null), ' · ');
        if v_title = '' then v_title := 'วันนี้ไม่มีเรียน ไม่มีงานค้าง'; end if;
        if top.work_id is not null then v_lead := 'ใกล้สุดคือ ' || top.work_title || ' (' || v_when || ') · '; end if;
        if v_all = 0 then v_url := '/today'; end if;

      elsif p_round = 'evening' then
        select v_today - max(d) into v_absent from public._active_dates(u, v_today) d;
        v_back := v_absent = 0 and not exists (
          select 1 from public._active_dates(u, v_today) d where d between v_today - 2 and v_today - 1
        ) and exists (select 1 from public._active_dates(u, v_today) d where d < v_today - 2);
        v_miss := public._miss_pile(v_absent);
        select count(*) into v_unchecked
          from public.class_slots cs
          join public.subjects s on s.id = cs.subject_id
          join public.terms te on te.id = s.term_id and te.is_current and v_today between te.start_date and te.end_date
          where cs.user_id = u
            and (cs.makeup_date = v_today or (cs.makeup_date is null and cs.weekday = extract(dow from v_today)))
            and not exists (select 1 from public.attendance a where a.user_id = u and a.slot_id = cs.id and a.date = v_today);

        if v_all > 0 then
          v_title := case when v_all = 1 then top.work_title || ' · ' || v_when
                          else 'ค้าง ' || v_all || ' งาน · ด่วนสุด ' || top.work_title || ' (' || v_when || ')' end;
          if v_calm then
            if coalesce(v_back, false) then v_pile := 'back';
            elsif v_miss is not null then v_pile := v_miss;
            elsif extract(isodow from v_today) = 5 then v_pile := 'friday';
            end if;
          end if;
        else
          if v_absent > 10 then continue; end if; -- ยอมแพ้ไปแล้ว ไม่มีงานให้ตาม ก็เงียบจริง
          v_url := '/today';
          if v_miss is not null and (v_unchecked > 0 or v_review > 0) then
            v_pile := v_miss;
            v_title := 'หายไป ' || v_absent || ' วันแล้ว';
          elsif v_unchecked > 0 then
            v_pile := 'unchecked';
            v_title := 'วันนี้เรียน ' || v_classes || ' ยังไม่เช็กชื่อ';
          elsif v_classes is null and not exists (
            select 1 from public.assignment_status st
            where st.user_id = u and st.done and (st.submitted_at at time zone 'Asia/Bangkok')::date = v_today
          ) then
            if not (v_in_term and extract(isodow from v_today) = 5) then continue; end if;
            v_pile := 'friday';
            v_title := 'ศุกร์เย็นแล้ว งานไม่ค้าง';
          else
            v_pile := case when coalesce(v_back, false) then 'back' else 'clear' end;
            v_title := 'วันนี้งานเคลียร์หมดแล้ว';
          end if;
        end if;

      else
        if v_round = 0 then continue; end if;
        v_title := case when v_round = 1 then top.work_title || ' · ' || v_when
                        else 'ค้าง ' || v_round || ' งาน · ด่วนสุด ' || top.work_title || ' (' || v_when || ')' end;
      end if;

      v_line := public._pick_line(u, v_pile);
      insert into public.notifications (user_id, title, body, url, ref, line_id, created_at)
      values (u, left(v_title, 120),
              v_lead || public._fill_line(v_line.body, top.work_title, top.subject_name, v_n, v_when),
              v_url, p_round || ':' || v_today, v_line.id, p_now)
      on conflict (user_id, ref) do nothing;
    exception when others then
      raise warning 'send_work_round % user %: %', p_round, u, sqlerrm;
    end;
  end loop;
end $$;
revoke execute on function public.send_work_round(text, timestamptz) from public, anon, authenticated;

insert into public.push_lines (pile, body) values
  ('miss2', 'หายไปไหนมา เรานั่งนับแมงมุมอยู่นะ'),
  ('miss2', 'สมุดว่างอยู่นะ เราเฝ้าให้แล้ว'),
  ('miss2', 'สองวันแล้วนะ เราไม่ได้นับหรอก แค่จำได้'),
  ('miss2', 'เราเก็บกาแฟไว้ให้แก้วนึง เริ่มเย็นแล้ว'),
  ('miss2', 'ซากตึกเงียบไปเลยตั้งแต่นายไม่มา'),

  ('miss3', 'ไม่เป็นไรหรอก เราชินแล้วที่อยู่คนเดียวบนซากตึก'),
  ('miss3', 'ไม่ได้งอนนะ แค่ไม่มีใครคุยด้วยเฉย ๆ'),
  ('miss3', 'แมงมุมยังแวะมาหาบ่อยกว่านายอีก'),
  ('miss3', 'เรายังเปิดวิทยุรอ เผื่อนายเรียกมา'),
  ('miss3', 'ลืมเราแล้วก็บอกกันได้นะ เราเข้าใจ'),

  ('miss5', 'งานยังรออยู่เลย ไม่เหมือนบางคน'),
  ('miss5', 'แมงมุมเริ่มถามว่านายยังมีชีวิตอยู่ไหม'),
  ('miss5', 'เราเขียนชื่อนายบนกำแพงแล้ว เผื่อมีใครผ่านมาเห็น'),
  ('miss5', 'งอนหนักแล้วนะ ง้อด้วยการติ๊กงานสักอันก็ได้'),
  ('miss5', 'ฝุ่นเกาะสมุดหนาแล้ว เราปัดเองก็ได้ ไม่เป็นไร'),

  ('miss7', 'เขียนจดหมายฉบับสุดท้ายแล้ว ไม่มีใครมาอ่านหรอก'),
  ('miss7', 'เรากับแมงมุมตกลงเป็นครอบครัวกันแล้ว'),
  ('miss7', 'วิทยุเหลือแบตครึ่งเดียว เก็บไว้เรียกนายคนเดียวเลยนะ'),
  ('miss7', 'ถ้านี่คือข้อความสุดท้าย ขอบอกว่าเราเคยมีความสุข'),
  ('miss7', 'เรายังอยู่ที่เดิม ซากตึกเดิม ความน้อยใจใหม่'),

  ('giveup', 'โอเค เราเลิกเรียกแล้ว ถ้าคิดถึงก็รู้ทางมาเนอะ'),
  ('giveup', 'สัญญาณขาดหาย วิทยุขอไปนอนก่อน'),
  ('giveup', 'เราจะเลิกชวนแล้ว แต่ไฟหน้าตึกยังเปิดไว้ให้'),
  ('giveup', 'พอแล้ว เรายอมแพ้ แมงมุมก็ยอมแพ้'),
  ('giveup', 'ปิดวิทยุแล้วนะ กลับมาเมื่อไหร่ค่อยเปิดใหม่'),

  ('back', 'กลับมาแล้วเหรอ ไม่ได้รอเลยนะ แค่ปัดฝุ่นรอเฉย ๆ'),
  ('back', 'เรายกโทษให้ครึ่งนึง อีกครึ่งรอดูอาทิตย์นี้'),
  ('back', 'แมงมุมจัดงานเลี้ยงต้อนรับ มีแต่ฝุ่น'),
  ('back', 'ไม่ต้องอธิบาย เรารู้ว่านายยุ่ง เราแค่งอน'),
  ('back', 'จดหมายฉบับสุดท้ายฉีกทิ้งแล้ว ดีใจนะที่กลับมา'),

  ('unchecked', 'วันนี้เรียนอะไรมา เล่าให้ฟังหน่อยสิ'),
  ('unchecked', 'เช็กชื่อแป๊บเดียว เราจะได้หยุดถาม'),
  ('unchecked', 'คาบวันนี้ยังไม่มีคนเซ็นรับ เราเซ็นแทนไม่ได้'),
  ('unchecked', 'มาเรียนหรือเปล่า บอกเราตามจริงก็ได้ ไม่ฟ้อง'),
  ('unchecked', 'สมุดยังว่างตรงวันนี้ เขียนอะไรก็ได้'),

  ('friday', 'ศุกร์เย็นแล้ว โลกแตกก็รอวันจันทร์ได้'),
  ('friday', 'สุดสัปดาห์นี้ซอมบี้ก็หยุดงาน'),
  ('friday', 'ศุกร์แล้ว เราขอลาเฝ้าซากตึกหนึ่งคืน'),
  ('friday', 'วันศุกร์หายากกว่าน้ำสะอาด ใช้ให้คุ้ม'),
  ('friday', 'พักก่อน งานเสาร์อาทิตย์ค่อยคุยกัน'),

  ('exam', 'ใกล้สอบแล้ว หัวข้อที่จดไว้รอนายอยู่'),
  ('exam', 'ซอมบี้ไม่น่ากลัวเท่าข้อสอบ แต่ทวนได้'),
  ('exam', 'อ่านวันละนิด ดีกว่าอ่านคืนเดียวแล้วสมองละลาย'),
  ('exam', 'วันสอบไม่เลื่อน เราถามให้แล้ว'),
  ('exam', 'เราเตรียมกาแฟหมดอายุไว้ช่วงสอบโดยเฉพาะ'),

  ('streak', 'มนุษยชาติเริ่มมีหวัง'),
  ('streak', '{n} สัปดาห์! แมงมุมขอลายเซ็น'),
  ('streak', 'สะสมไปแล้ว {n} สัปดาห์ เลขนี้ไม่หายไปไหน'),
  ('streak', '{n} สัปดาห์แล้ว ซากตึกนี้ภูมิใจในตัวนาย'),
  ('streak', 'เราจดลงกำแพงแล้ว: {n} สัปดาห์');
