-- ประกาศจากคาบ (ช่อง class_notes.next_text) → แจ้งเตือนคืนก่อนวันที่มีคาบ 20:10 (docs/mockups/a-announce.html)
-- กติกาเดียวกับ announcements() ใน lib/schedule.ts: ต่อวิชาใช้โน้ตล่าสุดที่กรอกช่องนี้ และยังไม่มีคาบของวิชานั้นผ่านไปหลังวันที่จด
-- ไม่มีตารางใหม่ (RLS ของ notifications/class_notes เดิมคุมอยู่แล้ว) · ฟังก์ชันเรียกได้จาก cron เท่านั้น
-- เจ้าของรันเองใน Supabase SQL Editor

create or replace function public.send_announce_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare
  tmr date := (now() at time zone 'Asia/Bangkok')::date + 1;
begin
  insert into public.notifications (user_id, title, body, url, ref)
  select distinct on (cs.user_id, cs.subject_id)
         cs.user_id,
         'พรุ่งนี้ ' || s.name || ' ' || to_char(cs.start_time, 'HH24:MI'),
         'คาบที่แล้วบอกไว้: ' || btrim(n.next_text),
         '/notes/' || s.id || '?note=' || n.id,
         'announce:' || n.id || ':' || tmr
  from public.class_slots cs
  join public.subjects s on s.id = cs.subject_id
  join public.terms t on t.id = s.term_id and t.is_current and tmr between t.start_date and t.end_date
  cross join lateral (
    select x.id, x.date, x.next_text from public.class_notes x
    where x.user_id = cs.user_id and x.subject_id = cs.subject_id and x.date < tmr and coalesce(btrim(x.next_text), '') <> ''
    order by x.date desc limit 1
  ) n
  where (cs.makeup_date = tmr or (cs.makeup_date is null and cs.weekday = extract(dow from tmr)))
    and exists (select 1 from public.push_subscriptions ps where ps.user_id = cs.user_id)
    -- ประกาศนี้พูดถึงคาบพรุ่งนี้จริง: ระหว่างวันที่จดถึงวันนี้ไม่มีคาบของวิชานี้คั่น
    and not exists (
      select 1 from generate_series(n.date + 1, tmr - 1, interval '1 day') g(d)
      join public.class_slots c2 on c2.subject_id = cs.subject_id
        and (c2.makeup_date = g.d::date or (c2.makeup_date is null and c2.weekday = extract(dow from g.d)))
    )
  order by cs.user_id, cs.subject_id, cs.start_time
  on conflict (user_id, ref) do nothing;
end $$;
revoke execute on function public.send_announce_reminders() from public, anon, authenticated;

select cron.schedule('class-announce', '10 13 * * *', $$select public.send_announce_reminders()$$); -- 20:10 ไทย
