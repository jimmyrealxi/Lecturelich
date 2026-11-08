import { useEffect, useState } from "react";
import { bangkokNow } from "@/lib/schedule";

/** เวลาไทยปัจจุบัน อัปเดตทุกนาที */
export function useNow() {
  const [now, setNow] = useState(() => bangkokNow());
  useEffect(() => {
    const t = setInterval(() => setNow(bangkokNow()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
