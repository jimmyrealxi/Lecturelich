// Service worker ของ StudyQuest (เว็บ/PWA เท่านั้น) — แพตเทิร์นจาก LabHub
//   หน้าเว็บ = เน็ตก่อน (ออฟไลน์ค่อยใช้ของเก่า) / ไฟล์ที่ชื่อมี hash + ไอคอน = cache ก่อน
//   ไม่ยุ่งกับคำขอไป Supabase (คนละโดเมน) → ข้อมูลสดเสมอ (แคชข้อมูลเป็นหน้าที่ TanStack Query)
//   ส่วนรับ Web Push จะเพิ่มในขั้น 2
// แก้ไฟล์นี้แล้วเปลี่ยน VERSION → cache เก่าถูกล้างตอนเปิดครั้งถัดไป

const VERSION = "sq-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function putCache(req, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => putCache(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  // มี ?query = ไฟล์ของ dev server (ชื่อไม่มี hash) → ไม่ cache
  const hashed = url.pathname.startsWith("/_expo/static/") || url.pathname.startsWith("/assets/");
  if (!url.search && (hashed || url.pathname.startsWith("/icons/"))) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => putCache(req, res))));
  }
});
