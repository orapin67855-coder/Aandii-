"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import type { PublicUser } from "@/lib/auth/rules";

export function AccountMenu() {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" }).then((res) => res.json()).then((data: { user: PublicUser | null }) => setUser(data.user)).catch(() => setUser(null));
  }, [path, open]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOpen(false);
    router.push("/login");
    router.refresh();
  };

  if (!user) {
    return (
      <Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-3 font-semibold text-brand-700 shadow-soft ring-1 ring-brand-100">
        <UserRound size={18} aria-hidden /> เข้าสู่ระบบ
      </Link>
    );
  }

  return (
    <div className="relative">
      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-3 font-semibold text-brand-700 shadow-soft ring-1 ring-brand-100" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm text-white" aria-hidden>{user.username.slice(0, 1)}</span>
        {user.username}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl bg-white p-2 shadow-soft ring-1 ring-brand-100">
          <p className="px-3 py-2 text-xs text-ink-soft">{user.email}</p>
          <Link href="/account" className="block rounded-xl px-3 py-3 font-semibold text-ink hover:bg-brand-50" onClick={() => setOpen(false)}>แก้ไขบัญชี</Link>
          <button type="button" className="block min-h-11 w-full rounded-xl px-3 text-left font-semibold text-ink hover:bg-brand-50" onClick={() => void logout()}>ออกจากระบบ</button>
        </div>
      )}
    </div>
  );
}
