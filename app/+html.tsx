import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

// โครงหน้า HTML ของเวอร์ชันเว็บ (เว็บเท่านั้น) · PWA: manifest / ไอคอน / theme-color อยู่ที่นี่
export default function Root({ children }: PropsWithChildren) {
  // SDK 58: สคริปต์แอป/CSS/ฟอนต์ ส่งมาทาง context นี้ ต้องวางเอง ไม่งั้นหน้าเว็บว่าง (ไม่มี JS)
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();
  return (
    <html lang="th" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* ห้ามใส่ viewport-fit=cover (แบบ LabHub): iPhone จะวางเว็บใต้แถบสถานะ (หัวจาง) + เหลือช่องว่างใต้แถบแท็บ */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#E9DDBF" />
        <meta name="application-name" content="Lecturelich" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS: "เพิ่มไปยังหน้าจอโฮม" เปิดเต็มจอแบบแอป (จำเป็นสำหรับ Web Push บน iPhone) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lecturelich" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: webAppCss }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

// ให้รู้สึกเหมือนแอป: แตะสองทีไม่ซูม / ไม่มีกรอบแวบตอนแตะ / หมุนจอแล้วตัวหนังสือไม่ขยายเอง
// กระดาษธีม A (ลายเยื่อ ขอบเก่า รูเข้าเล่ม เส้นกั้นแดงที่ 24px) = พื้นหลัง body ชิ้นเดียว · หน้าจอโปร่ง + เว้นซ้าย PAPER_INSET
const grain = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .1 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";
const webAppCss = `
html, body { touch-action: manipulation; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; background-color: #E9DDBF; }
body { -webkit-tap-highlight-color: transparent; min-height: 100%;
  background:
    radial-gradient(circle at 7px 7px, #3a3128 4.5px, transparent 5.5px) 6px 72px / 14px 60px repeat-y,
    linear-gradient(90deg, transparent 24px, rgba(160,40,29,.42) 24px 26px, transparent 26px) 0 0 / 100% 100% no-repeat,
    ${grain},
    radial-gradient(140% 100% at 50% 40%, transparent 60%, rgba(110,70,20,.26) 100%),
    #E9DDBF; }
::selection { background: #2B4A8A; color: #F3EAD2; }
`;
