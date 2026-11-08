import { useEffect, useState } from "react";
import { bangkokNow } from "@/lib/schedule";

/** เวลาไทยปัจจุบัน อัปเดตทุกนาที */
const read = () => ({ ...bangkokNow(), ms: Date.now() });

export function useNow() {
  const [now, setNow] = useState(read);
  useEffect(() => {
    const t = setInterval(() => setNow(read()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
