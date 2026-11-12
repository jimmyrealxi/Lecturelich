-- จดหลังคาบแยกประเภท (docs/mockups/a-notes-review.html · docs/UX_FEEDBACK.md ข้อ 5)
-- next_text = คาบหน้าเรียนอะไร/ประกาศ (โชว์จอเขียวหน้าโน้ตของวิชา + ใช้เตือนคืนก่อนเรียนทีหลัง)
-- read_more = หนังสือ/ลิงก์อ่านเพิ่ม
-- RLS: ใช้ policy class_notes_own (for all · user_id = auth.uid()) เดิม ครอบทุกคอลัมน์อยู่แล้ว ไม่ต้องเพิ่ม

alter table public.class_notes
  add column if not exists next_text text check (char_length(next_text) <= 300),
  add column if not exists read_more text check (char_length(read_more) <= 500);
