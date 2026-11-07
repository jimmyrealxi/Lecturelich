// Service worker ของ Lecturelich (เว็บ/PWA เท่านั้น) — แพตเทิร์นจาก LabHub
//   หน้าเว็บ = เน็ตก่อน (ออฟไลน์ค่อยใช้ของเก่า) / ไฟล์ที่ชื่อมี hash + ไอคอน = cache ก่อน
//   ไม่ยุ่งกับคำขอไป Supabase (คนละโดเมน) → ข้อมูลสดเสมอ (แคชข้อมูลเป็นหน้าที่ TanStack Query)
//   รับ Web Push จาก Edge Function send-push (ท้ายไฟล์)
// แก้ไฟล์นี้แล้วเปลี่ยน VERSION → cache เก่าถูกล้างตอนเปิดครั้งถัดไป

const VERSION = "sq-v2";
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

// ---------- Web Push (ขั้น 2 · แพตเทิร์น LabHub) ----------
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || "Lecturelich", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      tag: data.tag || undefined,
      lang: "th",
      data: { url: data.url || "/today" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/today", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      // แอปเปิดอยู่ → ใช้หน้าต่างเดิม ให้แอปเปลี่ยนหน้าเอง (lib/web/webPush ฟัง "sq-open")
      for (const client of list) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          const focused = await client.focus();
          (focused || client).postMessage({ type: "sq-open", url: target });
          return;
        } catch {}
      }
      return self.clients.openWindow(target);
    }),
  );
});
