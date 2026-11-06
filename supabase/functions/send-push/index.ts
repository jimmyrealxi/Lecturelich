// Edge Function: send-push — ส่ง Web Push ของ StudyQuest (แพตเทิร์น LabHub · ดู migration 20261108090000_stage2_notes_push.sql)
//   GET  → { publicKey } ให้แอปเว็บใช้สมัครรับ push
//   POST { id } ← trigger notifications_push (pg_net) → ส่งไปทุกเครื่องของผู้รับ
// secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT — ขั้นตอนใน docs/DEPLOY_PWA.md
// deploy --no-verify-jwt: trigger ไม่มี token / กันคนนอกด้วย id (uuid สุ่ม) + ต้องเพิ่งสร้างไม่เกิน 2 นาที

import { sendPush, type Vapid } from "./webpush.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return ""; } })();

const VAPID: Vapid = {
  publicKey: Deno.env.get("VAPID_PUBLIC_KEY") || "",
  privateKey: Deno.env.get("VAPID_PRIVATE_KEY") || "",
  subject: Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
const UUID = /^[0-9a-f-]{36}$/i;

async function pushNotification(id: string) {
  const recent = encodeURIComponent(new Date(Date.now() - 2 * 60 * 1000).toISOString());
  const nRes = await rest(`notifications?id=eq.${id}&created_at=gte.${recent}&select=id,user_id,title,body,url`);
  const [n] = nRes.ok ? await nRes.json() : [];
  if (!n) return json({ sent: 0 });
  const sRes = await rest(`push_subscriptions?user_id=eq.${n.user_id}&select=id,endpoint,p256dh,auth`);
  const subs: Sub[] = sRes.ok ? await sRes.json() : [];

  const gone: string[] = [];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      const status = await sendPush(s, { title: n.title, body: n.body, url: n.url, tag: n.id }, VAPID);
      if (status === 404 || status === 410) gone.push(s.id); // เครื่องเลิกรับแล้ว
      else if (status >= 200 && status < 300) sent++;
      else console.warn("push status", status, new URL(s.endpoint).host);
    } catch (e) {
      console.warn("push error", String(e));
    }
  }));
  if (gone.length) await rest(`push_subscriptions?id=in.(${gone.join(",")})`, { method: "DELETE" });
  return json({ sent, removed: gone.length });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") {
    return VAPID.publicKey ? json({ publicKey: VAPID.publicKey }) : json({ error: "not_configured" }, 503);
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!VAPID.publicKey || !VAPID.privateKey) return json({ error: "not_configured" }, 503);
  let data: { id?: unknown } = {};
  try { data = await req.json(); } catch { /* ไม่ใช่ JSON */ }
  const id = String(data.id || "");
  return UUID.test(id) ? pushNotification(id) : json({ error: "bad_id" }, 400);
});
