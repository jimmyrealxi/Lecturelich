// Edge Function: classroom — เชื่อม Google Classroom และดึงงานเข้างานส่วนตัว (migration 20261117090000_stage8_classroom.sql)
//   GET  ?code&state ← Google พากลับมาหลังอนุญาต
//   POST { action: start | courses | sync | disconnect } ← แอป (ต้องมี JWT ของผู้ใช้)
//   POST { action: cron } + x-cron-secret ← pg_cron ทุกชั่วโมง
// secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET · deploy --no-verify-jwt เพราะ Google กับ cron ไม่มี JWT จึงตรวจเองในไฟล์นี้

import { earnsXp, isChanged, isCurrent, isTurnedIn, turnedInAt, workFields, workKey, type Submission, type Work } from "./logic.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  (() => { try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return ""; } })();
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/classroom`;
const COURSES_SCOPE = "https://www.googleapis.com/auth/classroom.courses.readonly";
const WORK_SCOPE = "https://www.googleapis.com/auth/classroom.coursework.me.readonly";
const WORK_SCOPE_ALIAS = "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly"; // Google คืนชื่อนี้แทน
const ORIGINS = ["https://lecturelich.vercel.app", "http://localhost:8081"];
const API = "https://classroom.googleapis.com/v1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const redirect = (url: string) => new Response(null, { status: 302, headers: { Location: url } });

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
async function restOk(path: string, init: RequestInit = {}) {
  const r = await rest(path, init);
  if (!r.ok) throw new Error(`rest ${path}: ${r.status} ${await r.text()}`);
  return r;
}
const rows = async <T>(path: string) => (await (await restOk(path)).json()) as T[];
const eq = (v: string) => `eq.${encodeURIComponent(v)}`;
const setAccount = (user: string, patch: Record<string, unknown>) =>
  restOk(`classroom_accounts?user_id=${eq(user)}`, { method: "PATCH", body: JSON.stringify(patch) });

class Expired extends Error {}

async function exchange(params: Record<string, string>) {
  return await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  });
}

async function accessToken(user: string) {
  const [t] = await rows<{ refresh_token: string }>(`classroom_tokens?user_id=${eq(user)}&select=refresh_token`);
  if (!t) throw new Expired();
  const r = await exchange({ grant_type: "refresh_token", refresh_token: t.refresh_token });
  const body = await r.json();
  if (!r.ok) {
    if (body.error === "invalid_grant") throw new Expired();
    throw new Error(`token: ${r.status} ${body.error}`);
  }
  return body.access_token as string;
}

async function listAll<T>(url: string, field: string, token: string) {
  const out: T[] = [];
  let pageToken = "";
  do {
    const r = await fetch(url + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""), { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`classroom ${field}: ${r.status}`);
    const body = await r.json();
    out.push(...(body[field] ?? []));
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

type Course = { id: string; name: string; section?: string };

async function refreshCourses(user: string, token: string) {
  const courses = await listAll<Course>(`${API}/courses?studentId=me&courseStates=ACTIVE&pageSize=100`, "courses", token);
  if (courses.length) {
    // ส่งแค่ชื่อห้อง: enabled กับ subject_id ที่เจ้าของเลือกไว้ไม่ถูกเขียนทับ
    await restOk("classroom_courses?on_conflict=user_id,course_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(courses.map((c) => ({ user_id: user, course_id: c.id, name: c.name, section: c.section ?? null }))),
    });
  }
}

type Existing = {
  id: string; classroom_work_id: string; title: string; due_at: string | null; description: string | null; link: string | null;
  assignment_status: { done: boolean }[];
};

// ติ๊กเฉพาะงานที่ยังไม่มีแถวสถานะ: ถ้าเจ้าของเคยติ๊กหรือยกเลิกเองในแอป จะไม่ไปทับ
async function tickSubmitted(user: string, turnedIn: Map<string, string | null>) {
  const [account] = await rows<{ created_at: string }>(`classroom_accounts?user_id=${eq(user)}&select=created_at`);
  const works = await rows<{ id: string; classroom_work_id: string; assignment_status: unknown[] }>(`assignments?created_by=${eq(user)}&room_id=is.null&classroom_work_id=not.is.null&select=id,classroom_work_id,assignment_status(user_id)`);
  const ticks = works.filter((w) => !w.assignment_status.length && turnedIn.has(w.classroom_work_id))
    .map((w) => ({ id: w.id, at: turnedIn.get(w.classroom_work_id) ?? null }));
  if (!ticks.length) return;
  // trigger คิด XP จาก submitted_at จึงได้ก่อนกำหนด/ตรงเวลา/เลยกำหนดตามเวลาส่งจริง
  await restOk("assignment_status?on_conflict=user_id,assignment_id", {
    method: "POST", headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify(ticks.map((t) => ({ user_id: user, assignment_id: t.id, done: true, submitted_at: t.at }))),
  });
  const noXp = ticks.filter((t) => !earnsXp(t.at, account.created_at)).map((t) => t.id);
  if (noXp.length) await restOk(`xp_events?user_id=${eq(user)}&action=eq.submit&ref_id=in.(${noXp.join(",")})`, { method: "DELETE" });
}

async function syncUser(user: string) {
  try {
    const token = await accessToken(user);
    await refreshCourses(user, token);
    const courses = await rows<{ course_id: string; subject_id: string | null }>(`classroom_courses?user_id=${eq(user)}&enabled=is.true&select=course_id,subject_id`);
    const existing = await rows<Existing>(`assignments?created_by=${eq(user)}&room_id=is.null&classroom_work_id=not.is.null&select=id,classroom_work_id,title,due_at,description,link,assignment_status(done)`);
    const hidden = new Set((await rows<{ work_id: string }>(`classroom_hidden?user_id=${eq(user)}&select=work_id`)).map((h) => h.work_id));
    const byKey = new Map(existing.map((e) => [e.classroom_work_id, e]));
    const today = Date.parse(new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10) + "T00:00:00+07:00");

    const turnedIn = new Map<string, string | null>();
    let failed = 0;
    for (const c of courses) {
      let works: Work[];
      try {
        works = await listAll<Work>(`${API}/courses/${encodeURIComponent(c.course_id)}/courseWork?courseWorkStates=PUBLISHED&pageSize=100`, "courseWork", token);
      } catch (e) {
        // ห้องนี้ดึงไม่ได้ ห้ามตีความว่างานหาย จึงข้ามการลบของห้องนี้
        console.error(e);
        failed++;
        continue;
      }
      const seen = new Set<string>();
      const inserts = [];
      for (const w of works) {
        const key = workKey(w);
        seen.add(key);
        const next = workFields(w);
        const row = byKey.get(key);
        if (row) {
          if (isChanged(row, next)) await restOk(`assignments?id=${eq(row.id)}`, { method: "PATCH", body: JSON.stringify(next) });
        } else if (!hidden.has(key) && isCurrent(next.due_at, today)) {
          inserts.push({ ...next, created_by: user, subject_id: c.subject_id, source: "classroom", room_id: null, classroom_work_id: key });
        }
      }
      if (inserts.length) {
        await restOk("assignments?on_conflict=created_by,classroom_work_id", {
          method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify(inserts),
        });
      }
      // อาจารย์ลบงานแล้วลบตาม เว้นงานที่ติ๊กส่งไปแล้ว
      for (const e of existing) {
        if (e.classroom_work_id.startsWith(`${c.course_id}/`) && !seen.has(e.classroom_work_id) && !e.assignment_status[0]?.done) {
          await restOk(`assignments?id=${eq(e.id)}`, { method: "DELETE" });
        }
      }
      try {
        const subs = await listAll<Submission>(`${API}/courses/${encodeURIComponent(c.course_id)}/courseWork/-/studentSubmissions?userId=me&pageSize=100`, "studentSubmissions", token);
        for (const s of subs) if (isTurnedIn(s)) turnedIn.set(`${c.course_id}/${s.courseWorkId}`, turnedInAt(s));
      } catch (e) {
        // อ่านสถานะส่งไม่ได้ไม่กระทบการดึงงาน รอบถัดไปลองใหม่
        console.error(e);
      }
    }
    await tickSubmitted(user, turnedIn);
    const allFailed = courses.length > 0 && failed === courses.length;
    await setAccount(user, allFailed ? { last_error: "failed" } : { last_sync_at: new Date().toISOString(), last_error: null });
  } catch (e) {
    await setAccount(user, { last_error: e instanceof Expired ? "expired" : "failed" });
    throw e;
  }
}

async function callback(url: URL) {
  const state = url.searchParams.get("state") ?? "";
  const home = ORIGINS[0];
  if (!/^[0-9a-f-]{36}$/i.test(state)) return redirect(`${home}/classroom?error=denied`);
  const res = await restOk(`classroom_oauth_states?state=${eq(state)}&select=user_id,origin,created_at`, { method: "DELETE", headers: { Prefer: "return=representation" } });
  const [row] = await res.json() as { user_id: string; origin: string; created_at: string }[];
  if (!row || Date.now() - Date.parse(row.created_at) > 10 * 60_000) return redirect(`${home}/classroom?error=denied`);
  const back = ORIGINS.includes(row.origin) ? row.origin : home;
  const code = url.searchParams.get("code");
  if (!code) return redirect(`${back}/classroom?error=denied`);

  const r = await exchange({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI });
  const t = await r.json();
  const granted = String(t.scope ?? "").split(" ");
  if (!r.ok || !t.refresh_token || !granted.includes(COURSES_SCOPE) || !(granted.includes(WORK_SCOPE) || granted.includes(WORK_SCOPE_ALIAS))) {
    return redirect(`${back}/classroom?error=scope`);
  }
  const upsert = { method: "POST", headers: { Prefer: "resolution=merge-duplicates" } };
  await restOk("classroom_tokens?on_conflict=user_id", { ...upsert, body: JSON.stringify({ user_id: row.user_id, refresh_token: t.refresh_token }) });
  await restOk("classroom_accounts?on_conflict=user_id", { ...upsert, body: JSON.stringify({ user_id: row.user_id, last_error: null }) });
  return redirect(`${back}/classroom`);
}

async function currentUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: auth } });
  return r.ok ? ((await r.json()).id as string) : null;
}

async function start(user: string, origin: unknown) {
  if (typeof origin !== "string" || !ORIGINS.includes(origin)) return json({ error: "origin" }, 400);
  await restOk(`classroom_oauth_states?user_id=${eq(user)}`, { method: "DELETE" });
  const res = await restOk("classroom_oauth_states?select=state", {
    method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: user, origin }),
  });
  const [{ state }] = await res.json() as { state: string }[];
  const q = new URLSearchParams({
    client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: "code", access_type: "offline", prompt: "consent",
    scope: `${COURSES_SCOPE} ${WORK_SCOPE}`, state,
  });
  return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${q}` });
}

async function disconnect(user: string) {
  const [t] = await rows<{ refresh_token: string }>(`classroom_tokens?user_id=${eq(user)}&select=refresh_token`);
  if (t) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(t.refresh_token)}`, { method: "POST" }).catch(console.error);
  for (const table of ["classroom_tokens", "classroom_courses", "classroom_accounts"]) {
    await restOk(`${table}?user_id=${eq(user)}`, { method: "DELETE" });
  }
  return json({ ok: true });
}

async function cron(req: Request) {
  const [c] = await rows<{ secret: string }>("classroom_cron?select=secret");
  if (!c || req.headers.get("x-cron-secret") !== c.secret) return json({ error: "forbidden" }, 403);
  const accounts = await rows<{ user_id: string }>("classroom_accounts?select=user_id&or=(last_error.is.null,last_error.neq.expired)");
  for (const a of accounts) await syncUser(a.user_id).catch(console.error);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    if (req.method === "GET") return await callback(new URL(req.url));
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const body = await req.json().catch(() => ({}));
    if (body.action === "cron") return await cron(req);
    const user = await currentUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);
    if (body.action === "start") return await start(user, body.origin);
    if (body.action === "disconnect") return await disconnect(user);
    if (body.action === "courses") {
      await refreshCourses(user, await accessToken(user));
      return json({ ok: true });
    }
    if (body.action === "sync") {
      // กันกดรัว: ดึงไปแล้วภายใน 30 วินาทีไม่ต้องดึงซ้ำ
      const [a] = await rows<{ last_sync_at: string | null; last_error: string | null }>(`classroom_accounts?user_id=${eq(user)}&select=last_sync_at,last_error`);
      if (!a) return json({ error: "not_connected" }, 409);
      if (!a.last_error && a.last_sync_at && Date.now() - Date.parse(a.last_sync_at) < 30_000) return json({ ok: true });
      await syncUser(user);
      return json({ ok: true });
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Expired ? "expired" : "failed" }, e instanceof Expired ? 409 : 500);
  }
});
