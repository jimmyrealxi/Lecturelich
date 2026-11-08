/** เลขบนไอคอนแอป · 0 = เอาเลขออก · เครื่องที่ไม่รองรับหรือยังไม่อนุญาตแจ้งเตือนจะไม่เกิดอะไร */
export function setIconBadge(count: number) {
  if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;
  navigator.setAppBadge(count).catch(() => {});
}
