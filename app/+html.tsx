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
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#1F4E9C" />
        <meta name="application-name" content="StudyQuest" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS: "เพิ่มไปยังหน้าจอโฮม" เปิดเต็มจอแบบแอป (จำเป็นสำหรับ Web Push บน iPhone) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StudyQuest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
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
const webAppCss = `
html, body { touch-action: manipulation; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; background: #F4F1E8; }
body { -webkit-tap-highlight-color: transparent; }
`;
