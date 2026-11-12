-- ย้อนการกด "ทวนแล้ว" (แถบยกเลิก 3 วิ ในหน้าวันนี้ · docs/UX_FEEDBACK.md ข้อ 2)
-- ไม่มีตารางใหม่ → ไม่มี RLS เพิ่ม · xp_events ไม่มี policy delete จึงลบผ่านฟังก์ชันนี้เท่านั้น
-- p_last / p_next = ค่าก่อนกด (client เก็บไว้) · ยอมให้ย้อนได้แค่การทวนที่เพิ่งกดไม่เกิน 10 นาที

create or replace function public.unreview_topic(p_topic uuid, p_last timestamptz, p_next timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  t public.topics%rowtype;
begin
  select * into t from public.topics where id = p_topic and user_id = v_uid for update;
  if not found then raise exception 'topic not found'; end if;
  if t.review_stage = 0 or t.last_reviewed_at < now() - interval '10 minutes'
     or (p_last is not null and p_last >= t.last_reviewed_at) then
    raise exception 'nothing to undo';
  end if;

  -- review_topic ใส่ XP ใน transaction เดียวกัน → created_at = last_reviewed_at พอดี
  delete from public.xp_events
    where user_id = v_uid and subject_id = t.subject_id and action = 'review' and created_at = t.last_reviewed_at;

  update public.topics set review_stage = t.review_stage - 1, last_reviewed_at = p_last, next_review_at = p_next
    where id = p_topic;
end $$;
revoke execute on function public.unreview_topic(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.unreview_topic(uuid, timestamptz, timestamptz) to authenticated;
