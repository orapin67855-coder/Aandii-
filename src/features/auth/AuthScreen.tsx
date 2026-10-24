"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mascot } from "@/components/mascot/Mascot";
import { InstallApp } from "@/components/pwa/InstallApp";
import { PasswordField } from "@/features/auth/PasswordField";
import { detectInApp } from "@/lib/auth/inapp";
import { EDUCATION_LEVELS, PASSWORD_HINT, passwordError, type EducationLevel } from "@/lib/auth/rules";

const inputClass = "min-h-12 w-full rounded-2xl bg-brand-50 px-4 text-base text-ink ring-1 ring-brand-100";

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("ม.4");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const [providers, setProviders] = useState({ google: false, apple: false });
  const [inApp, setInApp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInApp(detectInApp(navigator.userAgent));
    void fetch("/api/auth/providers").then((res) => res.json()).then(setProviders).catch(() => undefined);
    if (mode !== "signup") return;
    void fetch("/api/auth/oauth/pending").then((res) => res.json()).then((data: { pending?: boolean; email?: string }) => {
      if (data.pending && data.email) {
        setOauthPending(true);
        setEmail(data.email);
      }
    }).catch(() => undefined);
  }, [mode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "signup" && !oauthPending) {
      const rule = passwordError(password);
      if (rule) {
        setError(rule);
        return;
      }
    }
    setPending(true);
    const path = oauthPending ? "/api/auth/oauth/pending" : mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body = oauthPending
      ? { username, educationLevel, age: Number(age) }
      : mode === "login"
        ? { email, password }
        : { email, password, username, educationLevel, age: Number(age) };
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json() as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "เข้าสู่ระบบไม่ได้");
      return;
    }
    router.push("/home");
    router.refresh();
  };

  const externalHref = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("openExternalBrowser", "1");
    return url.toString();
  };
  const provider = (name: "google" | "apple", label: string) => {
    if (!providers[name]) {
      return <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 font-semibold text-ink-soft ring-1 ring-brand-100" onClick={() => setError(`ยังไม่ได้เชื่อม ${name === "google" ? "Google" : "Apple"} บนเซิร์ฟเวอร์ ตอนนี้ใช้อีเมลได้ก่อนนะ`)}>{label}</button>;
    }
    if (name === "google" && inApp) {
      return <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 font-semibold text-ink ring-1 ring-brand-100" onClick={() => setError(`Google ไม่ให้ล็อกอินในเบราว์เซอร์ของ ${inApp} เปิดใน Safari หรือ Chrome ก่อนนะ`)}>{label}</button>;
    }
    return <a href={`/api/auth/oauth/${name}`} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 font-semibold text-ink ring-1 ring-brand-100">{label}</a>;
  };

  return (
    <div className="mx-auto grid w-full max-w-md gap-5">
      <div className="grid justify-items-center">
        <div className="relative mb-2 rounded-[28px] bg-white px-5 py-3 text-center text-lg font-bold text-brand-700 shadow-soft ring-1 ring-brand-100">
          สวัสดีจ้าา ดีใจที่ได้พบกัน
          <span aria-hidden className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-brand-100 bg-white" />
        </div>
        <Mascot state="cheer" size={190} />
      </div>
      <section className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-brand-100">
        <h1 className="text-2xl font-bold text-brand-700">{oauthPending ? "ตั้งชื่อในระบบ" : mode === "login" ? "เข้าสู่ระบบ" : "สมัครบัญชี"}</h1>
        <p className="mt-1 text-sm leading-6 text-ink-soft">{mode === "login" ? "มีบัญชีแล้ว ใส่อีเมลกับรหัสผ่านที่สมัครไว้" : "สร้างบัญชีใหม่ด้วยอีเมล รหัสผ่านถูกเข้ารหัสก่อนเก็บ"}</p>
        <div className="mt-4 grid gap-2">
          {inApp && (
            <div role="note" className="grid gap-2 rounded-2xl bg-sun-100 p-3 text-sm text-ink">
              <p>คุณกำลังเปิดจาก {inApp} การเข้าสู่ระบบด้วย Google ต้องเปิดใน Safari หรือ Chrome</p>
              <div className="flex flex-wrap gap-2">
                <a href={externalHref()} className="inline-flex min-h-11 items-center rounded-2xl bg-brand-600 px-4 font-semibold text-white">เปิดในเบราว์เซอร์</a>
                <button type="button" className="min-h-11 rounded-2xl bg-white px-4 font-semibold ring-1 ring-brand-100" onClick={() => { void navigator.clipboard.writeText(window.location.href).then(() => setCopied(true)).catch(() => setError("คัดลอกไม่ได้ ลองกดค้างที่แถบที่อยู่แล้วคัดลอกเอง")); }}>{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</button>
              </div>
            </div>
          )}
          {provider("google", mode === "login" ? "เข้าสู่ระบบด้วย Google" : "สมัครด้วย Google")}
          {provider("apple", mode === "login" ? "เข้าสู่ระบบด้วย Apple" : "สมัครด้วย Apple")}
        </div>
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          {!oauthPending && <label className="grid gap-1 text-sm font-semibold">อีเมล<input className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
          {oauthPending && <p className="text-sm text-ink-soft">{email}</p>}
          {!oauthPending && (
            <PasswordField label="รหัสผ่าน" value={password} onChange={setPassword} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          )}
          {mode === "login" && <Link href="/forgot" className="text-sm font-semibold text-brand-700">ลืมรหัสผ่าน</Link>}
          {mode === "signup" && !oauthPending && <p className="text-xs leading-5 text-ink-soft">{PASSWORD_HINT}</p>}
          {(mode === "signup" || oauthPending) && (
            <>
              <label className="grid gap-1 text-sm font-semibold">ชื่อผู้ใช้ที่จะขึ้นในระบบ<input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} required minLength={2} maxLength={24} /></label>
              <label className="grid gap-1 text-sm font-semibold">ระดับการศึกษา
                <select className={inputClass} value={educationLevel} onChange={(event) => setEducationLevel(event.target.value as EducationLevel)}>
                  {EDUCATION_LEVELS.map((level) => <option key={level}>{level}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">อายุ<input className={inputClass} inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} required /></label>
            </>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-sun-400 px-5 text-base font-semibold text-ink disabled:opacity-60" disabled={pending}>
            {oauthPending ? "บันทึกแล้วเข้าใช้งาน" : mode === "login" ? "เข้าสู่ระบบ" : "สมัครบัญชี"}
          </button>
        </form>
        <p className="mt-4 text-sm">
          {mode === "login"
            ? <Link href="/signup" className="font-semibold text-brand-700">ยังไม่มีบัญชี สมัครบัญชี</Link>
            : <Link href="/login" className="font-semibold text-brand-700">มีบัญชีแล้ว เข้าสู่ระบบ</Link>}
        </p>
      </section>
      <InstallApp />
    </div>
  );
}
