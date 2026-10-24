"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PasswordField } from "@/features/auth/PasswordField";
import { EDUCATION_LEVELS, PASSWORD_HINT, passwordError, type EducationLevel, type PublicUser } from "@/lib/auth/rules";

const inputClass = "min-h-12 w-full rounded-2xl bg-brand-50 px-4 text-base text-ink ring-1 ring-brand-100";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [username, setUsername] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("ม.4");
  const [age, setAge] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store" }).then((res) => res.json()).then((data: { user: PublicUser | null }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setUsername(data.user.username);
      setEducationLevel(data.user.educationLevel);
      setAge(String(data.user.age));
    });
  }, [router]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, educationLevel, age: Number(age) }),
    });
    const data = await res.json() as { error?: string; user?: PublicUser };
    if (!res.ok || !data.user) {
      setError(data.error ?? "บันทึกไม่ได้");
      return;
    }
    setUser(data.user);
    setMessage("บันทึกบัญชีแล้ว");
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const rule = passwordError(next);
    if (rule) {
      setError(rule);
      return;
    }
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "เปลี่ยนรหัสผ่านไม่ได้");
      return;
    }
    setCurrent("");
    setNext("");
    setMessage("เปลี่ยนรหัสผ่านแล้ว");
  };

  if (!user) return <p className="text-ink-soft">กำลังเปิดบัญชี...</p>;

  return (
    <div className="grid gap-5">
      <PageHeader title="บัญชี" subtitle="ชื่อผู้ใช้ ระดับการศึกษา และอายุ แก้ได้ภายหลัง" />
      <Card>
        <form className="grid gap-3" onSubmit={save}>
          <p className="text-sm text-ink-soft">อีเมล {user.email}</p>
          <label className="grid gap-1 text-sm font-semibold">ชื่อผู้ใช้<input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} required minLength={2} maxLength={24} /></label>
          <label className="grid gap-1 text-sm font-semibold">ระดับการศึกษา
            <select className={inputClass} value={educationLevel} onChange={(event) => setEducationLevel(event.target.value as EducationLevel)}>
              {EDUCATION_LEVELS.map((level) => <option key={level}>{level}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">อายุ<input className={inputClass} inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} required /></label>
          <Button type="submit" className="min-h-12 w-fit">บันทึก</Button>
        </form>
      </Card>
      <Card>
        <h2 className="font-bold">เปลี่ยนรหัสผ่าน</h2>
        <form className="mt-3 grid gap-3" onSubmit={savePassword}>
          <PasswordField label="รหัสผ่านเดิม" value={current} onChange={setCurrent} autoComplete="current-password" />
          <PasswordField label="รหัสผ่านใหม่" value={next} onChange={setNext} autoComplete="new-password" />
          <p className="text-xs text-ink-soft">{PASSWORD_HINT}</p>
          <Button type="submit" variant="secondary" className="min-h-12 w-fit">เปลี่ยนรหัสผ่าน</Button>
        </form>
      </Card>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-mint-700">{message}</p>}
    </div>
  );
}
