"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CalendarDays, Egg, Home, MessageCircle, Settings, Timer } from "lucide-react";
import clsx from "clsx";
import { AccountMenu } from "@/components/layout/AccountMenu";

const NAV = [
  { href: "/home", label: "Home", th: "หน้าแรก", Icon: Home },
  { href: "/planner", label: "Planner", th: "แผน", Icon: CalendarDays },
  { href: "/focus", label: "Focus", th: "โฟกัส", Icon: Timer },
  { href: "/progress", label: "Progress", th: "พัฒนาการ", Icon: BarChart3 },
  { href: "/buddy", label: "Rooms", th: "ห้อง", Icon: Egg },
  { href: "/learn", label: "Learn", th: "ข้อสอบ", Icon: BookOpen },
  { href: "/tutor", label: "Tutor", th: "ติว", Icon: MessageCircle },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[260px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2">
        ข้ามไปเนื้อหาหลัก
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 border-r border-brand-100 bg-white/70 p-5 backdrop-blur md:flex">
        <Link href="/home" className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white">A</span>
          <span className="leading-tight">
            <span className="block text-lg font-bold text-brand-700">Aandii</span>
            <span className="block text-xs text-ink-soft">ใครไม่อ่าน แต่เราอ่านดิ</span>
          </span>
        </Link>
        <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
          {NAV.map(({ href, label, th, Icon }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={clsx("flex min-h-[48px] items-center gap-3 rounded-2xl px-4 font-medium transition",
                active(href) ? "bg-brand-600 text-white shadow-soft" : "text-ink-soft hover:bg-brand-50")}>
              <Icon size={20} aria-hidden /> <span>{label}</span> <span className="ml-auto text-xs opacity-70">{th}</span>
            </Link>
          ))}
        </nav>
        <Link href="/settings" className="mt-auto flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-ink-soft hover:bg-brand-50">
          <Settings size={20} aria-hidden /> ตั้งค่า / ความเป็นส่วนตัว
        </Link>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex justify-end px-4 py-3 md:px-8">
          <AccountMenu />
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-4 md:px-8 md:pb-8">{children}</main>
      </div>

      <nav aria-label="เมนูหลัก (มือถือ)" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ href, label, th, Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} aria-label={`${label} ${th}`}
            className={clsx("flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              active(href) ? "text-brand-600" : "text-ink-soft")}>
            <span className={clsx("grid h-8 w-12 place-items-center rounded-full", active(href) && "bg-brand-100")}><Icon size={20} aria-hidden /></span>
            {th}
          </Link>
        ))}
      </nav>
    </div>
  );
}
