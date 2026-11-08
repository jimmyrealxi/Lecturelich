import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { signedUrls } from "@/lib/photos";
import { color, font, minTouch, radius, space } from "@/lib/theme";

// จอดูรูปกระดานขนาดเต็ม (docs/mockups/a-photo-viewer.html)
export type ViewerPhoto = { id: string; thumb?: string; local?: boolean }; // id = path ใน Storage หรือ uri ในเครื่อง (local)

const ZOOM = 2.5;

export function PhotoViewer({ photos, index, title, onIndex, onClose, onDelete }: {
  photos: ViewerPhoto[];
  index: number;
  title: string;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete?: (i: number) => void;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 }); // อยู่นอก Stage → เปลี่ยนรูปแล้วไม่ต้องวัดจอใหม่ รูปไม่กะพริบ
  const photo = photos[index];
  if (!photo) return null;
  return (
    <Modal visible animationType="none" onRequestClose={onClose}>
      <View style={s.screen}>
        <View style={s.top}>
          <Pressable onPress={onClose} style={s.close} accessibilityRole="button" accessibilityLabel="ปิดรูป">
            <Text style={s.closeText}>‹ ปิด</Text>
          </Pressable>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <Text style={s.count} accessibilityLiveRegion="polite">{index + 1}/{photos.length}</Text>
        </View>
        <Stage key={photo.id} photo={photo} box={box} onBox={setBox}
          onPrev={index > 0 ? () => onIndex(index - 1) : undefined}
          onNext={index < photos.length - 1 ? () => onIndex(index + 1) : undefined}
          many={photos.length > 1}
          onDelete={onDelete && (() => onDelete(index))} />
      </View>
    </Modal>
  );
}

function Stage({ photo, box, onBox, onPrev, onNext, many, onDelete }: {
  photo: ViewerPhoto;
  box: { width: number; height: number };
  onBox: (b: { width: number; height: number }) => void;
  onPrev?: () => void;
  onNext?: () => void;
  many: boolean;
  onDelete?: () => void;
}) {
  const remote = useQuery({
    queryKey: ["photo-full", photo.id],
    enabled: !photo.local,
    staleTime: 50 * 60_000, // ลิงก์อยู่ได้ 1 ชม.
    queryFn: async () => {
      const url = (await signedUrls([photo.id]))[photo.id];
      if (!url) throw new Error("no signed url");
      return url;
    },
  });
  const full = photo.local ? photo.id : remote.data;

  const [loaded, setLoaded] = useState(false);
  const [brokenUrl, setBrokenUrl] = useState<string>(); // ผูกกับลิงก์ → ลิงก์เก่าหมดอายุแล้วได้ลิงก์ใหม่ = หายเอง
  const [zoomed, setZoomed] = useState(false);
  const [ratio, setRatio] = useState(4 / 3);

  const scroller = useRef<ComponentRef<typeof View>>(null);
  const shot = useRef<ComponentRef<typeof View>>(null);
  const focus = useRef({ x: 0.5, y: 0.5 });

  const broken = !!full && brokenUrl === full;
  const failed = (broken || remote.isError) && !remote.isFetching;

  const sizeFrom = photo.thumb ?? full;
  useEffect(() => {
    if (sizeFrom) Image.getSize(sizeFrom, (w, h) => setRatio(w / h), () => {});
  }, [sizeFrom]);

  const fit = Math.min(box.width, box.height * ratio);
  const width = zoomed ? fit * ZOOM : fit;
  const height = width / ratio;

  // shortcut: เลื่อนรูปที่ขยายด้วย scrollLeft/Top ของ DOM (แอปเป็น PWA) — ถ้าทำแอป native ค่อยเปลี่ยนเป็น ScrollView แบบซูมได้
  useEffect(() => {
    const el = scroller.current as unknown as HTMLElement | null;
    if (!zoomed || !el) return;
    el.scrollLeft = width * focus.current.x - el.clientWidth / 2;
    el.scrollTop = height * focus.current.y - el.clientHeight / 2;
  }, [zoomed, width, height]);

  useEffect(() => {
    if (Platform.OS !== "web" || zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed, onPrev, onNext]);

  const toggleZoom = (e?: GestureResponderEvent) => {
    const click = e?.nativeEvent as unknown as MouseEvent | undefined;
    const r = (shot.current as unknown as HTMLElement | null)?.getBoundingClientRect?.();
    // กดจากคีย์บอร์ด clientX = 0 → ขยายตรงกลาง
    focus.current = click?.clientX && r
      ? { x: (click.clientX - r.left) / r.width, y: (click.clientY - r.top) / r.height }
      : { x: 0.5, y: 0.5 };
    setZoomed((z) => !z);
  };
  const retry = () => {
    setBrokenUrl(undefined);
    setLoaded(false);
    if (!photo.local) void remote.refetch();
  };

  const status = failed ? "" : !loaded ? "กำลังโหลดรูปเต็ม…" : zoomed ? "เลื่อนเพื่อดูส่วนอื่น" : "";

  return (
    <>
      <View ref={scroller} style={[s.stage, { overflow: zoomed ? "scroll" : "hidden" }]}
        onLayout={(e) => onBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {failed ? (
          <View style={s.fail}>
            <Text style={s.failText}>โหลดรูปไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง</Text>
            <Act label="ลองอีกครั้ง" onPress={retry} grow={false} />
          </View>
        ) : fit > 0 && (
          <Pressable ref={shot} onPress={toggleZoom} style={{ width, height, margin: "auto" }}
            accessibilityRole="button" accessibilityLabel={zoomed ? "ย่อรูปให้พอดีจอ" : "ขยายรูป"}>
            {!!photo.thumb && !loaded && <Image source={{ uri: photo.thumb }} blurRadius={6} style={StyleSheet.absoluteFill} resizeMode="contain" />}
            {!!full && !broken && (
              <Image source={{ uri: full }} style={StyleSheet.absoluteFill} resizeMode="contain"
                onLoad={() => setLoaded(true)} onError={() => setBrokenUrl(full)} />
            )}
          </Pressable>
        )}
      </View>

      <Text style={s.status} accessibilityLiveRegion="polite">{status}</Text>
      <View style={s.foot}>
        <View style={s.bar}>
          {many && <Act label="‹ ก่อนหน้า" onPress={onPrev} />}
          <Act label={zoomed ? "พอดีจอ" : "ขยาย"} onPress={failed ? undefined : () => toggleZoom()} selected={zoomed} />
          {many && <Act label="ถัดไป ›" onPress={onNext} />}
        </View>
        {onDelete && <Act label="ลบรูปนี้" onPress={onDelete} grow={false} />}
      </View>
    </>
  );
}

function Act({ label, onPress, selected = false, grow = true }: { label: string; onPress?: () => void; selected?: boolean; grow?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityState={{ selected, disabled: !onPress }}
      style={({ pressed }) => [s.act, grow && { flex: 1 }, selected && s.actOn, !onPress && s.actOff, pressed && { opacity: 0.8 }]}>
      <Text style={[s.actText, selected && { color: color.paper }, !onPress && { color: color.onMuted }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  top: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, minHeight: 56 },
  close: { minHeight: minTouch, minWidth: minTouch, justifyContent: "center" },
  closeText: { fontFamily: font.bodyMedium, fontSize: 14, color: color.on },
  title: { flex: 1, textAlign: "center", fontFamily: font.body, fontSize: 13, color: color.onMuted },
  count: { fontFamily: font.typeBold, fontSize: 15, color: color.on, minWidth: 34, textAlign: "right" },
  stage: { flex: 1, minHeight: 0 },
  fail: { margin: "auto", paddingHorizontal: space.xl, alignItems: "center", gap: space.md },
  failText: { fontFamily: font.body, fontSize: 14, color: color.on, textAlign: "center" },
  status: { fontFamily: font.body, fontSize: 13, color: color.onMuted, textAlign: "center", minHeight: 20 },
  foot: { width: "100%", maxWidth: 560, alignSelf: "center", padding: space.md, paddingTop: space.sm, gap: 6 },
  bar: { flexDirection: "row", gap: 6 },
  act: {
    minHeight: 48, paddingHorizontal: space.md, borderWidth: 1.5, borderColor: color.rule2, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
  },
  actOn: { backgroundColor: color.on, borderColor: color.on },
  actOff: { borderStyle: "dashed" },
  actText: { fontFamily: font.bodyBold, fontSize: 14, color: color.on },
});
