import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { currentUserId, supabase } from "@/lib/supabase";

// รูปกระดาน: ย่อในเครื่องก่อนอัปโหลด (แพตเทิร์น lib/shrinkPhoto.ts ของ LabHub) + รูปย่อสำหรับรายการ
const BUCKET = "note-photos";
export const PHOTO_MAX = 1600; // อ่านตัวหนังสือบนกระดานได้
const THUMB_MAX = 320;

/** ย่อด้านยาวสุดไม่เกิน maxSide + JPEG · ย่อไม่ได้ = คืนรูปเดิม (ไม่ให้การบันทึกล้มเพราะรูป) */
async function shrink(uri: string, maxSide: number, quality: number): Promise<string> {
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    let image = original;
    if (Math.max(original.width, original.height) > maxSide) {
      const ctx = ImageManipulator.manipulate(original);
      ctx.resize(original.width >= original.height ? { width: maxSide } : { height: maxSide });
      image = await ctx.renderAsync();
    }
    return (await image.saveAsync({ compress: quality, format: SaveFormat.JPEG })).uri;
  } catch {
    return uri;
  }
}

/** ถ่ายรูป / เลือกรูป (เว็บเปิดตัวเลือกไฟล์ ซึ่งบนมือถือมีให้ถ่ายรูปด้วย) · ยกเลิก = null */
export async function pickPhoto(camera: boolean): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  if (camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  return res.canceled ? null : res.assets[0].uri;
}

export const thumbPath = (path: string) => path.replace(/\.jpg$/, "-t.jpg");

/** อัปโหลดรูปเต็ม + รูปย่อ → คืน path ของรูปเต็ม (<user_id>/<วันที่>-<สุ่ม>.jpg) */
export async function uploadNotePhoto(uri: string, date: string): Promise<string> {
  const uid = await currentUserId();
  const path = `${uid}/${date}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const [full, thumb] = await Promise.all([shrink(uri, PHOTO_MAX, 0.7), shrink(uri, THUMB_MAX, 0.6)]);
  for (const [p, u] of [[path, full], [thumbPath(path), thumb]] as const) {
    const body = await (await fetch(u)).arrayBuffer();
    const { error } = await supabase.storage.from(BUCKET).upload(p, body, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
  }
  return path;
}

export async function deleteNotePhotos(paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths.flatMap((p) => [p, thumbPath(p)]));
}

/** ลิงก์ดูรูปชั่วคราว 1 ชม. (bucket เป็น private) */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
