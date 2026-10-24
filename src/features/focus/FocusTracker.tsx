"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SleepZs } from "@/components/mascot/SleepZs";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { react, type MascotEvent } from "@/lib/mascot-messages";

type Subject = { id: string; name: string };
type Session = { id: string; status: "running" | "paused"; subjectId: string | null; bankedSeconds: number; runningSince: string | null };

const fmt = (seconds: number) => [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");

export function FocusTracker() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [offset, setOffset] = useState(0);
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [event, setEvent] = useState<MascotEvent>("greet");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const applyNow = (serverNow?: number) => {
    if (typeof serverNow === "number") setOffset(serverNow - Date.now());
  };

  useEffect(() => {
    void fetch("/api/focus/session", { cache: "no-store" }).then(async (res) => {
      if (res.status === 401) {
        setLocked(true);
        return;
      }
      const data = await res.json() as { session?: Session | null; subjects?: Subject[]; serverNow?: number };
      applyNow(data.serverNow);
      setSubjects(data.subjects ?? []);
      setSession(data.session ?? null);
      setSelected(data.session?.subjectId ?? data.subjects?.[0]?.id ?? "");
      if (data.session) setEvent(data.session.status === "running" ? "session_start" : "session_pause");
    }).catch(() => setMessage("โหลดไม่สำเร็จ ลองรีเฟรชหน้านี้")).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  const seconds = session
    ? session.bankedSeconds + (session.status === "running" && session.runningSince ? Math.max(0, Math.floor((Date.now() + offset - new Date(session.runningSince).getTime()) / 1000)) : 0)
    : 0;
  const running = session?.status === "running";

  const call = useCallback(async (body: object) => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/focus/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({})) as { error?: string; session?: Session | null; serverNow?: number; subject?: Subject; subjects?: Subject[] };
      if (res.status === 401) {
        setLocked(true);
        return null;
      }
      if (!res.ok) {
        setMessage(data.error ?? "บันทึกเวลาไม่ได้");
        return null;
      }
      applyNow(data.serverNow);
      if (data.subjects) setSubjects(data.subjects);
      return data;
    } catch {
      setMessage("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const begin = async (subjectId: string) => {
    const data = await call({ action: "start", subjectId });
    if (data?.session) {
      setSession(data.session);
      setEvent("session_start");
    }
  };

  const finish = async () => {
    if (!session) return null;
    const data = await call({ action: "complete" });
    if (data) {
      setSession(null);
      setMessage("บันทึกเวลาแล้ว");
      setEvent("session_done");
    }
    return data;
  };

  const pick = async (id: string) => {
    if (id === selected) return;
    const wasRunning = running;
    setSelected(id);
    if (!session) return;
    const data = await finish();
    if (data && wasRunning) await begin(id);
  };

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const data = await call({ action: "addSubject", name: trimmed });
    if (data?.subject) {
      setSelected(data.subject.id);
      setName("");
      setAdding(false);
    }
  };

  if (locked) {
    return (
      <div className="grid justify-items-center gap-4 text-center">
        <Mascot state="cheer" size={160} />
        <p>เข้าสู่ระบบก่อน เวลาจะได้ถูกบันทึกในบัญชี</p>
        <Link href="/login" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  const reaction = react(running && seconds >= 3000 ? "long_session" : event);
  const currentName = subjects.find((item) => item.id === selected)?.name ?? "";
  const chip = "min-h-11 rounded-2xl px-4 font-semibold ring-1";
  if (!ready) return <div className="h-64" aria-hidden />;

  return (
    <div className="grid gap-5">
      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="grid justify-items-center gap-2">
          <div className="relative" style={{ filter: running ? "drop-shadow(0 0 26px rgba(246,201,69,.9))" : undefined, transition: "filter 1s" }}>
            <Mascot state={running ? "cheer" : "sleepy"} size={160} bob={running} />
            {!running && <SleepZs />}
          </div>
          <p role="status" className="max-w-[16rem] text-center text-sm font-semibold text-brand-700">{reaction.line}</p>
        </div>
        <div className="grid gap-4">
          <div className={`text-6xl font-extrabold tabular-nums ${running ? "text-brand-700 drop-shadow-[0_0_22px_rgba(246,201,69,.7)]" : "text-ink-soft"}`} role="timer">{fmt(seconds)}</div>
          <div role="group" aria-label="เลือกวิชาที่กำลังอ่าน" className="flex flex-wrap gap-2">
            {subjects.map((item) => (
              <button key={item.id} type="button" aria-pressed={item.id === selected} disabled={busy} onClick={() => void pick(item.id)} className={`${chip} ${item.id === selected ? "bg-sun-100 text-ink ring-sun-400" : "bg-white text-ink ring-brand-100"}`}>{item.name}</button>
            ))}
            {adding ? (
              <span className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} aria-label="ชื่อรายวิชาใหม่" placeholder="ชื่อวิชา" onKeyDown={(e) => { if (e.key === "Enter") void add(); if (e.key === "Escape") setAdding(false); }} className="min-h-11 w-40 rounded-2xl bg-brand-50 px-3 text-base ring-1 ring-brand-100" />
                <Button onClick={() => void add()} className="min-h-11">เพิ่ม</Button>
              </span>
            ) : <button type="button" onClick={() => setAdding(true)} className={`${chip} bg-brand-50 text-brand-700 ring-brand-100`}>+ เพิ่มรายวิชา</button>}
          </div>
          <div className="flex flex-wrap gap-3">
            {!session && <button type="button" disabled={busy || !selected} onClick={() => void begin(selected)} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink disabled:opacity-60">เริ่มอ่าน {currentName}</button>}
            {running && <Button variant="secondary" disabled={busy} onClick={async () => { const data = await call({ action: "pause" }); if (data?.session) { setSession(data.session); setEvent("session_pause"); } }} className="min-h-12 flex-1">พัก</Button>}
            {session?.status === "paused" && <Button disabled={busy} onClick={async () => { const data = await call({ action: "resume" }); if (data?.session) { setSession(data.session); setEvent("session_start"); } }} className="min-h-12 flex-1">อ่านต่อ</Button>}
            {session && <Button variant="secondary" disabled={busy} onClick={() => void finish()} className="min-h-12">จบรอบ</Button>}
            {session && <Button variant="secondary" disabled={busy} onClick={async () => { const data = await call({ action: "cancel" }); if (data) setSession(null); }} className="min-h-12">ยกเลิก</Button>}
          </div>
          <p className="min-h-5 text-sm" role="status">{message}</p>
        </div>
      </div>
    </div>
  );
}
