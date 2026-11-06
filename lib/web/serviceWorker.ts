// ลงทะเบียน public/sw.js (เว็บเท่านั้น) — ส่วน push จะเพิ่มในขั้น 2 แบบ lib/web/webPush.ts ของ LabHub
export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
