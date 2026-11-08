const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.]+/g, "");

/** เดาวิชาจากชื่อห้อง Classroom: รหัสหรือชื่อวิชาอยู่ในชื่อห้อง · เลือกที่ยาวสุด เจอไม่ชัดคืน null ให้เจ้าของเลือกเอง */
export function guessSubject(course: string, subjects: { id: string; name: string; code: string | null }[]) {
  const c = norm(course);
  let best: { id: string; len: number } | null = null;
  for (const s of subjects) {
    for (const key of [s.code, s.name].filter((k): k is string => !!k).map(norm)) {
      if (key.length >= 2 && c.includes(key) && (!best || key.length > best.len)) best = { id: s.id, len: key.length };
    }
  }
  return best?.id ?? null;
}
