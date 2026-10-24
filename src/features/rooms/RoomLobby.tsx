"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/features/auth/PasswordField";
import { Card } from "@/components/ui/Card";
import { formatClock } from "@/lib/rooms/rules";
import type { RoomSummary } from "@/lib/rooms/store";

const inputClass = "min-h-12 w-full rounded-2xl bg-brand-50 px-4 text-base text-ink ring-1 ring-brand-100";

function rememberName(name: string) {
  localStorage.setItem("aandii-display-name", name);
}

export function RoomLobby() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [showRank, setShowRank] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const load = async () => {
    const res = await fetch("/api/rooms", { cache: "no-store" });
    const data = await res.json() as { rooms?: RoomSummary[] };
    setRooms(data.rooms ?? []);
  };

  useEffect(() => {
    const saved = localStorage.getItem("aandii-display-name");
    if (saved) setDisplayName(saved);
    void load();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, displayName, isPublic, password: isPublic ? null : password, showRank }),
    });
    const data = await res.json() as { error?: string; room?: { id: string }; seatId?: string; inviteToken?: string };
    setPending(false);
    if (!res.ok || !data.room || !data.seatId) {
      setError(data.error ?? "สร้างห้องไม่ได้");
      return;
    }
    rememberName(displayName);
    localStorage.setItem(`aandii-seat:${data.room.id}`, data.seatId);
    if (data.inviteToken) localStorage.setItem(`aandii-invite:${data.room.id}`, data.inviteToken);
    router.push(`/buddy/rooms/${data.room.id}`);
  };

  const shown = rooms.filter((room) => room.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">สร้างห้องอ่าน</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">ตั้งชื่อห้องได้เอง เปิดสาธารณะหรือล็อกด้วยรหัสผ่าน ห้องรับได้ 20 คน และขึ้นให้ทุกบัญชีเห็น เวลาอ่านรีเซ็ตทุกเที่ยงคืนตามเวลาไทย</p>
        <form className="mt-4 grid gap-3" onSubmit={create}>
          <label className="grid gap-1 text-sm font-semibold">ชื่อห้อง<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required /></label>
          <label className="grid gap-1 text-sm font-semibold">ชื่อบนโต๊ะ<input className={inputClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={24} required /></label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={isPublic ? "primary" : "secondary"} onClick={() => setIsPublic(true)}>สาธารณะ</Button>
            <Button type="button" variant={!isPublic ? "primary" : "secondary"} onClick={() => setIsPublic(false)}>ล็อกรหัส</Button>
          </div>
          {!isPublic && <PasswordField label="รหัสผ่าน" value={password} onChange={setPassword} autoComplete="new-password" minLength={4} maxLength={40} />}
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={showRank} onChange={(event) => setShowRank(event.target.checked)} /> แสดงอันดับวันนี้ในห้องนี้</label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button type="submit" className="min-h-12" disabled={pending}>สร้างห้อง</Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-bold">ห้องที่เปิดอยู่</h2>
        <label className="mb-3 grid gap-1 text-sm font-semibold">ค้นหาชื่อห้อง
          <input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="เช่น ห้องอ่านม.5" aria-label="ค้นหาชื่อห้อง" />
        </label>
        {rooms.length === 0 ? <p className="text-sm text-ink-soft">ยังไม่มีห้อง สร้างห้องแรก แล้วทุกบัญชีจะเห็นห้องนี้</p> : (
          <ul className="grid gap-2">
            {shown.map((room) => (
              <li key={room.id}>
                <button type="button" onClick={() => router.push(`/buddy/rooms/${room.id}`)} className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 text-left">
                  {room.isPublic ? <LockOpen size={18} aria-hidden className="text-brand-600" /> : <Lock size={18} aria-hidden className="text-sun-600" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{room.name}</span>
                    <span className="block text-xs text-ink-soft">{room.isPublic ? "สาธารณะ" : "มีแม่กุญแจ"} · {room.seats}/{room.capacity} คน · กำลังอ่าน {room.readers} คน · รวมวันนี้ {formatClock(room.todaySeconds)}</span>
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="text-sm text-ink-soft">ไม่พบห้องชื่อนี้</li>}
          </ul>
        )}
      </Card>
    </div>
  );
}
