"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { PasswordField } from "@/features/auth/PasswordField";
import { SleepZs } from "@/components/mascot/SleepZs";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Desk } from "@/features/rooms/Desk";
import { SUBJECTS, formatClock, subjectName } from "@/lib/rooms/rules";
import type { PublicRoom } from "@/lib/rooms/store";

const inputClass = "min-h-12 w-full rounded-2xl bg-brand-50 px-4 text-base text-ink ring-1 ring-brand-100";

export function StudyRoom({ roomId, invite }: { roomId: string; invite?: string | null }) {
  const router = useRouter();
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [seatId, setSeatId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [subjectId, setSubjectId] = useState<string>(SUBJECTS[0].id);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [focusLock, setFocusLock] = useState(false);
  const [seatReady, setSeatReady] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [shared, setShared] = useState("");
  const [shownSeconds, setShownSeconds] = useState(0);
  const [drops, setDrops] = useState(0);
  const [adding, setAdding] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");
  const clock = useRef({ seconds: 0, at: Date.now(), reading: false });

  const load = useCallback(async () => {
    const res = await fetch(`/api/rooms/${roomId}`, { cache: "no-store" });
    if (!res.ok) {
      setError("ไม่พบห้องนี้");
      return;
    }
    const data = await res.json() as { room: PublicRoom; inviteToken?: string | null };
    setRoom(data.room);
    if (data.inviteToken) {
      localStorage.setItem(`aandii-invite:${roomId}`, data.inviteToken);
      setInviteToken(data.inviteToken);
    }
    const mine = data.room.seats.find((seat) => seat.id === seatId);
    if (mine) setReading(mine.reading);
  }, [roomId, seatId]);

  useEffect(() => {
    setSeatId(localStorage.getItem(`aandii-seat:${roomId}`));
    setDisplayName(localStorage.getItem("aandii-display-name") ?? "");
    setInviteToken(localStorage.getItem(`aandii-invite:${roomId}`));
    setSeatReady(true);
  }, [roomId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!seatId) return;
    const id = window.setInterval(() => { void load(); }, 15000);
    return () => window.clearInterval(id);
  }, [seatId, load]);

  const send = useCallback(async (nextReading: boolean, nextSubject: string) => {
    if (!seatId) return;
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId, reading: nextReading, subjectId: nextSubject }),
    });
    const data = await res.json() as { error?: string; room?: PublicRoom };
    if (!res.ok || !data.room) {
      setReading(false);
      setError(data.error ?? "อัปเดตเวลาไม่ได้");
      return;
    }
    setRoom(data.room);
    setReading(nextReading);
  }, [roomId, seatId]);

  useEffect(() => {
    if (!reading || !seatId) return;
    const id = window.setInterval(() => { void send(true, subjectId); }, 4000);
    const onHide = () => {
      if (document.hidden) {
        if (focusLock) setDrops((count) => count + 1);
        void send(false, subjectId);
        setNotice("ออกจากหน้าอ่านแล้ว เวลาถูกพักให้ กลับมากดเริ่มอ่านต่อได้เลย");
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [focusLock, reading, seatId, send, subjectId]);

  const join = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName, password: password || null, invite: invite || null }),
    });
    const data = await res.json() as { error?: string; room?: PublicRoom; seatId?: string };
    if (!res.ok || !data.room || !data.seatId) {
      setError(data.error ?? "เข้าห้องไม่ได้");
      return;
    }
    localStorage.setItem("aandii-display-name", displayName);
    localStorage.setItem(`aandii-seat:${roomId}`, data.seatId);
    setSeatId(data.seatId);
    setRoom(data.room);
  };

  const toggleRank = async () => {
    if (!seatId || !room) return;
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId, showRank: !room.showRank }),
    });
    const data = await res.json() as { room?: PublicRoom; error?: string };
    if (data.room) setRoom(data.room);
    else setError(data.error ?? "เปลี่ยนอันดับไม่ได้");
  };

  const begin = async () => {
    setNotice("");
    await send(true, subjectId);
    if (!focusLock) return;
    try {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    } catch {
      setNotice("เบราว์เซอร์นี้ไม่ให้เต็มจอ เวลาจะหยุดเองเมื่อสลับแท็บ");
    }
  };

  const rest = () => {
    void send(false, subjectId);
    setNotice("พักแล้ว เก่งมาก ดื่มน้ำสักอึกได้เลย");
  };

  const pick = (id: string) => {
    setSubjectId(id);
    if (reading) void send(true, id);
  };

  const addSubject = async () => {
    if (!seatId) return;
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId, name: subjectDraft }),
    });
    const data = await res.json() as { error?: string; room?: PublicRoom; subject?: { id: string } };
    if (!res.ok || !data.room || !data.subject) {
      setError(data.error ?? "เพิ่มวิชาไม่ได้");
      return;
    }
    setRoom(data.room);
    setSubjectId(data.subject.id);
    if (reading) void send(true, data.subject.id);
    setSubjectDraft("");
    setAdding(false);
  };

  const leave = async () => {
    if (!seatId) return;
    await fetch(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seatId, leave: true }),
    });
    localStorage.removeItem(`aandii-seat:${roomId}`);
    router.push("/buddy");
  };

  useEffect(() => {
    const onFull = () => {
      if (!document.fullscreenElement && focusLock && reading && document.visibilityState === "visible") {
        setFullscreen(false);
        setReading(false);
        setDrops((count) => count + 1);
        setNotice("ออกจากโหมดเต็มจอแล้ว เวลาถูกพักให้ กลับมากดเริ่มอ่านต่อได้");
        void send(false, subjectId);
      }
    };
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, [focusLock, reading, send, subjectId]);

  const mine = room?.seats.find((seat) => seat.id === seatId) ?? null;
  const subjects = room?.subjects?.length ? room.subjects : SUBJECTS.map((subject) => ({ id: subject.id, name: subject.name }));
  const shownFor = (seat: { id: string; todaySeconds: number }) => seat.id === seatId && reading ? shownSeconds : seat.todaySeconds;
  const ordered = [...(room?.seats ?? [])].sort((a, b) => shownFor(b) - shownFor(a));
  const longest = Math.max(1, ...ordered.map((seat) => shownFor(seat)));
  const roomTotal = ordered.reduce((sum, seat) => sum + shownFor(seat), 0);
  const clockSeconds = reading ? shownSeconds : (mine?.todaySeconds ?? 0);
  const face = reading ? "cheer" : clockSeconds >= 3600 ? "yay" : "sleepy";
  const liveExtra = mine && reading ? Math.max(0, shownSeconds - mine.todaySeconds) : 0;
  const rowsFor = (seat: NonNullable<typeof mine>, extra: number) => {
    const totals = new Map<string, number>();
    for (const subject of subjects) totals.set(subject.name, seat.subjectSeconds[subject.id] ?? 0);
    for (const item of seat.bySubject ?? []) totals.set(item.name, Math.max(totals.get(item.name) ?? 0, item.seconds));
    if (extra > 0) {
      const name = subjectName(subjectId, subjects);
      totals.set(name, (totals.get(name) ?? 0) + extra);
    }
    return [...totals.entries()].map(([name, seconds]) => ({ name, seconds }));
  };

  useEffect(() => {
    const server = mine?.todaySeconds ?? 0;
    const elapsed = clock.current.reading ? Math.floor((Date.now() - clock.current.at) / 1000) : 0;
    const next = reading ? Math.max(server, clock.current.seconds + elapsed) : server;
    clock.current = { seconds: next, at: Date.now(), reading };
    setShownSeconds(next);
  }, [mine?.todaySeconds, reading]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const extra = clock.current.reading ? Math.floor((Date.now() - clock.current.at) / 1000) : 0;
      setShownSeconds(clock.current.seconds + extra);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const share = async () => {
    const token = inviteToken;
    if (!token) {
      setShared("ลิงก์เชิญมีให้คนสร้างห้อง");
      return;
    }
    const url = `${window.location.origin}/buddy/rooms/${roomId}?invite=${token}`;
    try {
      if (navigator.share) await navigator.share({ title: room?.name ?? "ห้องอ่าน", url });
      else {
        await navigator.clipboard.writeText(url);
        setShared("คัดลอกลิงก์แล้ว ส่งต่อในแอปอื่นได้");
      }
    } catch {
      setShared(url);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft">ใครไม่อ่าน แต่เราอ่านดิ</p>
          <h1 className="text-2xl font-bold text-brand-700">{room?.name ?? "ห้องอ่าน"}</h1>
        </div>
        <div className="flex gap-2">
          {mine && <button type="button" onClick={() => void leave()} className="inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-semibold text-ink-soft">ออกจากห้อง</button>}
          <Link href="/buddy" className="inline-flex min-h-11 items-center rounded-2xl px-4 font-semibold text-brand-700">กลับ</Link>
        </div>
      </div>
      {room && !room.isPublic && <p className="inline-flex items-center gap-2 text-sm font-semibold text-sun-600"><Lock size={16} aria-hidden /> ห้องนี้ล็อกด้วยรหัสผ่าน</p>}
      {seatReady && !mine && (
        <Card>
          <h2 className="font-bold">เข้าห้อง</h2>
          <form className="mt-3 grid gap-3" onSubmit={join}>
            <label className="grid gap-1 text-sm font-semibold">ชื่อบนโต๊ะ<input className={inputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={24} /></label>
            {room && !room.isPublic && !invite && <PasswordField label="รหัสผ่าน" value={password} onChange={setPassword} autoComplete="current-password" />}
            {invite && !room?.isPublic && <p className="text-sm text-ink-soft">เข้าจากลิงก์เชิญ ไม่ต้องใส่รหัสห้อง</p>}
            <Button type="submit" className="min-h-12">นั่งที่โต๊ะ</Button>
          </form>
        </Card>
      )}
      {mine && (
        <Card className="text-center">
          <div className={`relative mx-auto grid h-40 w-40 place-items-center rounded-[32px] bg-white transition duration-700 ${reading ? "shadow-[0_0_0_6px_rgba(246,201,69,.55),0_0_44px_10px_rgba(246,201,69,.45)]" : ""}`}>
            <Mascot state={face} size={130} bob={face !== "sleepy"} />
            {face === "sleepy" && <SleepZs />}
          </div>
          <p className="mt-3 text-sm text-ink-soft">{mine.userId ? "เวลารวมทุกห้องของบัญชีวันนี้" : "เวลาของที่นั่งนี้วันนี้"} · {subjectName(reading ? subjectId : mine.subjectId, subjects)}</p>
          <p className={`text-6xl font-bold tabular-nums transition duration-700 ${reading ? "text-brand-700 drop-shadow-[0_0_18px_rgba(246,201,69,.85)]" : "text-ink-soft"}`}>{formatClock(clockSeconds)}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="วิชาที่กำลังอ่าน">
            {subjects.map((subject) => (
              <button key={subject.id} type="button" aria-pressed={subjectId === subject.id} onClick={() => pick(subject.id)} className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ring-2 ${subjectId === subject.id ? "bg-sun-400 text-ink ring-sun-400" : "bg-cream text-ink ring-brand-100"}`}>
                {subject.name}
              </button>
            ))}
            <button type="button" className="min-h-11 rounded-2xl bg-white px-3 text-sm font-semibold text-brand-700 ring-2 ring-brand-100" onClick={() => setAdding((open) => !open)}>+ เพิ่มรายวิชา</button>
          </div>
          {adding && (
            <form className="mx-auto mt-3 grid max-w-sm gap-2 text-left" onSubmit={(event) => { event.preventDefault(); void addSubject(); }}>
              <label className="grid gap-1 text-sm font-semibold">ชื่อวิชา
                <input className={inputClass} value={subjectDraft} maxLength={30} onChange={(event) => setSubjectDraft(event.target.value)} />
              </label>
              <Button type="submit" className="min-h-12">เพิ่มวิชา</Button>
            </form>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {!reading ? <button type="button" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-sun-400 px-5 text-base font-semibold text-ink" onClick={() => void begin()}>เริ่มอ่าน {subjectName(subjectId, subjects)}</button> : <Button variant="secondary" className="min-h-12" onClick={rest}>พักก่อน</Button>}
          </div>
          <label className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-6 w-6" checked={focusLock} onChange={(event) => setFocusLock(event.target.checked)} />
            โหมดล็อกโฟกัส{fullscreen ? " · กำลังเต็มจอ" : ""}
          </label>
          <p className="mt-2 text-sm text-ink-soft">เว็บปิดแอปอื่นทั้งเครื่องไม่ได้ เมื่อสลับออกจากหน้า เวลาจะพักเอง{drops > 0 ? ` · หลุดโฟกัส ${drops} ครั้ง` : ""} แอปที่อนุญาตบนเครื่องต้องตั้งในโหมดโฟกัสของระบบปฏิบัติการ</p>
          {inviteToken && <button type="button" onClick={() => void share()} className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-brand-50 px-4 text-sm font-semibold text-brand-700">แชร์ลิงก์ห้อง</button>}
          {shared && <p className="mt-2 break-all text-sm text-ink-soft">{shared}</p>}
          <ul className="mt-4 grid gap-2 text-left text-sm">
            {rowsFor(mine, liveExtra).map((subject) => (
              <li key={subject.name} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2">
                <span className="truncate">{subject.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-brand-100"><span className="block h-full bg-sun-400" style={{ width: `${Math.min(100, subject.seconds / 36)}%` }} /></span>
                <span className="tabular-nums text-ink-soft">{formatClock(subject.seconds)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-ink-soft">{notice}</p>}
      {room?.showRank ? (
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-bold">อันดับวันนี้</h2>
            <b className="text-sm">รวมห้อง {formatClock(roomTotal)}</b>
          </div>
          {mine && <div className="mb-3 flex justify-end"><Button variant="ghost" onClick={() => void toggleRank()}>ปิดอันดับ</Button></div>}
          <p className="mb-3 text-sm text-ink-soft">รวมเวลาทุกวิชาของวันนี้ในบัญชีที่เข้าห้องนี้ เช่น ไทย 1 ชม. กับวิทย์ 2 ชม. จะขึ้นรวม 3 ชม. พักได้ และเวลาไม่หาย</p>
          <ol className="grid gap-2">
            {ordered.map((seat, index) => {
              const seconds = shownFor(seat);
              const lines = rowsFor(seat, seat.id === seatId ? liveExtra : 0).filter((item) => item.seconds > 0);
              return (
              <li key={seat.id} className="grid grid-cols-[1.5rem_auto_1fr_auto] items-center gap-2 text-sm">
                <span className="font-bold text-brand-700">{index + 1}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${seat.reading || (seat.id === seatId && reading) ? "bg-mint-400" : "bg-slate-300"}`} aria-hidden />
                <span className="truncate font-semibold">{seat.displayName}{seat.id === seatId ? " · คุณ" : ""}</span>
                <span className="tabular-nums">{formatClock(seconds)}</span>
                <span className="col-span-4 h-2 overflow-hidden rounded-full bg-brand-50"><span className="block h-full bg-sun-400" style={{ width: `${(seconds / longest) * 100}%` }} /></span>
                <span className="col-span-4 pl-8 text-xs text-ink-soft">{lines.map((item) => `${item.name} ${formatClock(item.seconds)}`).join(" · ") || "ยังไม่ได้อ่าน"}</span>
              </li>
              );
            })}
          </ol>
        </Card>
      ) : mine && <Button variant="secondary" onClick={() => void toggleRank()}>เปิดอันดับวันนี้</Button>}
      <section aria-label="โต๊ะในห้อง" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map((seat) => <Desk key={seat.id} name={seat.displayName} seconds={shownFor(seat)} subjectId={seat.id === seatId && reading ? subjectId : seat.subjectId} reading={seat.reading || (seat.id === seatId && reading)} subjects={subjects} />)}
      </section>
    </div>
  );
}
