import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const font = Noto_Sans_Thai({ subsets: ["thai", "latin"], display: "swap" });
export const metadata: Metadata = {
  title: "Aandii (อ่านดิ)",
  description: "ใครไม่อ่าน แต่เราอ่านดิ",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Aandii" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#4F6FB5" };

// AppShell ถูกใส่ใน src/app/(app)/layout.tsx แล้ว จึงไม่ซ้ำที่นี่
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={font.className}>{children}</body>
    </html>
  );
}
