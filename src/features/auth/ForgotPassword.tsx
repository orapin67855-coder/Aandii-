"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/features/auth/PasswordField";
import { PASSWORD_HINT, passwordError } from "@/lib/auth/rules";

const inputClass = "min-h-12 w-full rounded-2xl bg-brand-50 px-4 text-base text-ink ring-1 ring-brand-100";

export function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [shown, setShown] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json() as { error?: string; code?: string };
    setPending(false);
    if (!res.ok || !data.code) {
      setError(data.error ?? "ขอรหัสไม่ได้");
      return;
    }
    setShown(data.code);
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const rule = passwordError(password);
    if (rule) {
      setError(rule);
      return;
    }
    if (password !== confirm) {
      setError("รหัสยืนยันไม่ตรงกับรหัสใหม่");
      return;
    }
    setPending(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code, password, confirm }),
    });
    const data = await res.json() as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "เปลี่ยนรหัสไม่ได้");
      return;
    }
    router.push("/home");
    router.refresh();
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-brand-100">
      <h1 className="text-2xl font-bold text-brand-700">ลืมรหัสผ่าน</h1>
      <p className="mt-1 text-sm leading-6 text-ink-soft">ใส่อีเมลที่ใช้สมัคร แล้วกรอกรหัส 6 หลักเพื่อตั้งรหัสใหม่ รหัสใหม่ใช้ได้ทันที</p>
      {!shown && (
        <form className="mt-4 grid gap-3" onSubmit={requestCode}>
          <label className="grid gap-1 text-sm font-semibold">อีเมล
            <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink disabled:opacity-60" disabled={pending}>ขอรหัส 6 หลัก</button>
        </form>
      )}
      {shown && (
        <form className="mt-4 grid gap-3" onSubmit={savePassword}>
          <p className="rounded-2xl bg-sun-100 px-4 py-3 text-center" role="status">
            <span className="block text-sm font-semibold text-ink-soft">รหัส 6 หลัก</span>
            <span className="mt-1 block text-3xl font-bold tracking-[0.3em] text-ink">{shown}</span>
          </p>
          <label className="grid gap-1 text-sm font-semibold">กรอกรหัส 6 หลัก
            <input className={inputClass} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
          </label>
          <PasswordField label="รหัสผ่านใหม่" value={password} onChange={setPassword} autoComplete="new-password" />
          <p className="text-xs leading-5 text-ink-soft">{PASSWORD_HINT}</p>
          <PasswordField label="ยืนยันรหัสผ่าน" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink disabled:opacity-60" disabled={pending}>เปลี่ยนรหัสทันที</button>
        </form>
      )}
      <p className="mt-4 text-sm"><Link href="/login" className="font-semibold text-brand-700">กลับไปเข้าสู่ระบบ</Link></p>
    </section>
  );
}
