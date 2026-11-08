// ห้องร่วม (ขั้น 6) — ไม่ผูกกับ UI

/**
 * งานในห้องอาจผูก subject ของเพื่อน → แปลงเป็นวิชาของเราเองด้วยรหัสวิชา (course_code)
 * ไม่เจอ = null (โชว์เป็นงานไม่มีวิชา)
 */
export function mySubjectId(
  a: { subject_id: string | null; course_code: string | null },
  mine: { id: string; code: string | null }[],
): string | null {
  if (a.subject_id && mine.some((s) => s.id === a.subject_id)) return a.subject_id;
  const code = a.course_code?.trim().toUpperCase();
  return (code && mine.find((s) => s.code?.trim().toUpperCase() === code)?.id) || null;
}

/** โค้ดห้อง 8 ตัวจากที่ผู้ใช้พิมพ์ (ตัดช่องว่าง/ขีด, ตัวพิมพ์ใหญ่) → null ถ้าไม่ถูกรูปแบบ */
export function normRoomCode(s: string): string | null {
  const c = s.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{8}$/.test(c) ? c : null;
}
