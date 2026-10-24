"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw, Square, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Mascot, type MascotState } from "@/components/mascot/Mascot";
import { ProgressBar } from "@/components/ui/ProgressBar";

type Status = "idle" | "running" | "paused" | "done" | "locked";
type Session = { status: "running" | "paused" | "completed" | "cancelled"; elapsed: number; targetSeconds: number };

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function FocusTimer() {
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [target, setTarget] = useState(25 * 60);
  const [askCancel, setAskCancel] = useState(false);
  const [error, setError] = useState("");

  const apply = (session: Session | null) => {
    if (!session || session.status === "completed" || session.status === "cancelled") {
      if (session?.status === "completed") {
        setElapsed(session.elapsed);
        setTarget(session.targetSeconds);
        setStatus("done");
        return;
      }
      setElapsed(0);
      setStatus("idle");
      return;
    }
    setElapsed(session.elapsed);
    setTarget(session.targetSeconds);
    setStatus(session.status === "running" ? "running" : "paused");
  };

  const send = async (action: "start" | "pause" | "resume" | "complete" | "cancel") => {
    setError("");
    const res = await fetch("/api/focus/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    if (res.status === 401) {
      setStatus("locked");
      return;
    }
    const data = await res.json() as { error?: string; session?: Session | null };
    if (!res.ok) {
      setError(data.error ?? "บันทึกเวลาไม่ได้");
      return;
    }
    apply(data.session ?? null);
    setAskCancel(false);
  };

  useEffect(() => {
    void fetch("/api/focus/session", { cache: "no-store" }).then(async (res) => {
      if (res.status === 401) {
        setStatus("locked");
        return;
      }
      const data = await res.json() as { session?: Session | null };
      apply(data.session ?? null);
    }).catch(() => setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"));
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => {
      setElapsed((value) => Math.min(target, value + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, target]);

  const mascot: MascotState = status === "running" ? "focused" : status === "done" ? "celebrating" : status === "paused" ? "resting" : "ready";
  const msg = { idle: "พร้อมเมื่อไหร่ก็เริ่มได้เลย", running: "กำลังโฟกัส เก่งมาก!", paused: "พักสักครู่ก็ได้ ไม่เป็นไรนะ", done: "เสร็จแล้ว เวลาถูกบันทึกในบัญชี", locked: "เข้าสู่ระบบก่อน เวลาจะได้ถูกบันทึก" }[status];

  if (status === "locked") {
    return (
      <div className="grid justify-items-center gap-4 text-center">
        <Mascot state="cheer" size={170} />
        <p className="text-ink-soft">{msg}</p>
        <Link href="/login" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <div className="mx-auto"><Mascot state={mascot} size={170} /></div>
      <div className="space-y-4">
        <p className="text-ink-soft">{msg}</p>
        <p role="timer" aria-live="off" className="text-center font-[family-name:var(--font-head)] text-6xl font-bold tabular-nums text-brand-700 md:text-left md:text-7xl">{fmt(elapsed)}</p>
        <ProgressBar value={elapsed} max={target} label="ความคืบหน้าของรอบโฟกัส" />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-3">
          {status === "idle" && <Button className="min-h-12 flex-1" onClick={() => void send("start")}><Play size={18} aria-hidden /> เริ่มโฟกัส 25 นาที</Button>}
          {status === "running" && <Button className="min-h-12 flex-1" onClick={() => void send("pause")}><Pause size={18} aria-hidden /> พัก</Button>}
          {status === "paused" && <Button className="min-h-12 flex-1" onClick={() => void send("resume")}><Play size={18} aria-hidden /> อ่านต่อ</Button>}
          {(status === "running" || status === "paused") && <Button variant="secondary" onClick={() => void send("complete")}><Square size={18} aria-hidden /> จบรอบ</Button>}
          {status === "done" && <Button className="min-h-12 flex-1" onClick={() => { setStatus("idle"); setElapsed(0); }}><RotateCcw size={18} aria-hidden /> เริ่มรอบใหม่</Button>}
        </div>
        {(status === "running" || status === "paused") && (
          <div className="pt-1">
            {!askCancel ? <Button variant="ghost" onClick={() => setAskCancel(true)}><X size={16} aria-hidden /> ยกเลิกรอบนี้</Button> : (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 p-3" role="alertdialog" aria-label="ยืนยันการยกเลิก">
                <span className="text-sm">ยกเลิกรอบนี้? เวลาจะไม่ถูกบันทึก</span>
                <Button variant="danger" onClick={() => void send("cancel")}>ยืนยันยกเลิก</Button>
                <Button variant="ghost" onClick={() => setAskCancel(false)}>กลับ</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
