import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useFocusEffect } from "expo-router";

/**
 * ลูปฉากเกม (เว็บ): requestAnimationFrame + ลอจิกจังหวะคงที่ทุก `ms` (ค่าเริ่ม 85ms ≈ 12 ครั้ง/วิ) แล้ววาดในจังหวะเดียวกัน
 * หยุดเมื่อ canvas พ้นจอ / ออกจากแท็บหรือหน้า / เบราว์เซอร์ซ่อน · prefers-reduced-motion = วาดภาพนิ่ง (tick 0) ทุกครั้งที่ render
 * tick(n) เก็บสถานะใน ref ของผู้เรียก ไม่ใช้ useState ต่อเฟรม
 */
export function useLoop(ref: RefObject<HTMLCanvasElement | null>, tick: (n: number) => void, ms = 85) {
  const tickRef = useRef(tick);
  const ctl = useRef({ focused: true, reduced: false, sync: () => {} });
  useEffect(() => {
    tickRef.current = tick;
    if (ctl.current.reduced) tick(0);
  });

  useEffect(() => {
    const cv = ref.current;
    if (!cv || typeof window === "undefined") return;
    let n = 0;
    tickRef.current(0);
    ctl.current.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (ctl.current.reduced) return;
    let raf = 0, last = 0, acc = 0, seen = true;
    const frame = (t: number) => {
      acc += Math.min(250, last ? t - last : 0); // กลับมาจากพักไม่วิ่งไล่เฟรมที่หายไป
      last = t;
      if (acc >= ms) { acc %= ms; tickRef.current(++n); }
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      const on = seen && ctl.current.focused && !document.hidden;
      if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      else if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
    io?.observe(cv);
    document.addEventListener("visibilitychange", sync);
    ctl.current.sync = sync;
    sync();
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      ctl.current.sync = () => {};
    };
  }, [ref, ms]);

  useFocusEffect(
    useCallback(() => {
      const c = ctl.current;
      c.focused = true;
      c.sync();
      return () => { c.focused = false; c.sync(); };
    }, []),
  );
}
