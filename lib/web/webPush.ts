import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

// PWA + Web Push (เว็บเท่านั้น · แพตเทิร์นจาก LabHub) — service worker = public/sw.js / ส่ง = Edge Function send-push
// iPhone: Safari รับ push ได้เฉพาะตอนติดตั้งเป็นแอปหน้าจอโฮมแล้ว (iOS 16.4+) และต้องกดขออนุญาตจากปุ่มเท่านั้น

export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on";

const isWeb = Platform.OS === "web";
const FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""}/functions/v1/send-push`;

export const isIOS = () =>
  isWeb && (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1));

export const isStandalone = () =>
  isWeb && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);

const hasPush = () =>
  isWeb && typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** เรียกครั้งเดียวตอนเปิดแอป · onOpen = แตะแจ้งเตือนตอนแอปเปิดอยู่ → เปลี่ยนหน้าแทนโหลดใหม่ */
export function registerServiceWorker(onOpen: (path: string) => void) {
  if (!isWeb || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("message", (e: MessageEvent) => {
    if (e.data?.type !== "sq-open" || typeof e.data.url !== "string") return;
    const url = new URL(e.data.url, location.origin);
    if (url.origin === location.origin) onOpen(url.pathname + url.search);
  });
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function getPushState(): Promise<PushState> {
  if (!isWeb) return "unsupported";
  if (isIOS() && !isStandalone()) return "ios-install";
  if (!hasPush()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  try {
    return (await currentSubscription()) ? "on" : "off";
  } catch {
    return "off";
  }
}

function keyToBytes(base64url: string) {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((base64url.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const sameKey = (a: ArrayBuffer, b: Uint8Array) => {
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

/** เปิดแจ้งเตือนบนเครื่องนี้ (ต้องเรียกจากการกดปุ่ม) — คืนข้อความผิดพลาด หรือ null = สำเร็จ */
export async function enablePush(): Promise<string | null> {
  if (!hasPush()) return "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "ไม่ได้รับอนุญาต — เปิดได้ที่การตั้งค่าของเบราว์เซอร์";

  let publicKey = "";
  try {
    const res = await fetch(FN_URL);
    publicKey = res.ok ? (await res.json()).publicKey : "";
  } catch {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง";
  }
  if (!publicKey) return "ระบบแจ้งเตือนยังไม่ได้ตั้งค่า (VAPID ใน Supabase)";

  try {
    const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const key = keyToBytes(publicKey);
    let sub = await reg.pushManager.getSubscription();
    // กุญแจฝั่งเซิร์ฟเวอร์เปลี่ยน (สร้าง VAPID ใหม่) → สมัครใหม่
    const current = sub?.options.applicationServerKey;
    if (sub && current && !sameKey(current, key)) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const j = sub.toJSON();
    const { error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_user_agent: navigator.userAgent,
    });
    return error ? "บันทึกการแจ้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง" : null;
  } catch {
    return "เปิดการแจ้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง";
  }
}

/** ปิดแจ้งเตือนบนเครื่องนี้ */
export async function disablePush() {
  if (!hasPush()) return;
  try {
    const sub = await currentSubscription();
    if (!sub) return;
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  } catch {
    // endpoint ที่เลิกใช้จะถูกลบเองตอนส่งครั้งถัดไป (410)
  }
}
