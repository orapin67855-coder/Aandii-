"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MascotBubble } from "@/components/mascot/MascotBubble";
import type { MascotEvent } from "@/lib/mascot-messages";

/** แฟลชการ์ดทบทวนแบบ Leitner 3 กล่อง เก็บในเครื่อง (localStorage) — ย้ายไป Supabase ภายหลัง */
type Flash = { id: string; front: string; back: string; box: 1 | 2 | 3; due: number };
const KEY = "aandii.flashcards.v1";
const DAY = 86_400_000;
const GAP = { 1: 0, 2: DAY, 3: 3 * DAY } as const;

function load(): Flash[] {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p.filter((c) => c && typeof c.front === "string" && typeof c.back === "string") : [];
  } catch { return []; }
}

export function Flashcards() {
  const [cards, setCards] = useState<Flash[]>([]);
  const [ready, setReady] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [event, setEvent] = useState<MascotEvent>("empty");
  const [count, setCount] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => { const c = load(); setCards(c); setReady(true); setEvent(c.length ? "greet" : "empty"); }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(cards)); setErr(""); } catch { setErr("บันทึกในเครื่องไม่ได้ (พื้นที่เต็มหรือปิดการเก็บข้อมูล)"); }
  }, [cards, ready]);

  const now = Date.now();
  const queue = cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
  const current = queue[0];

  const add = () => {
    const f = front.trim(), b = back.trim();
    if (!f || !b) return;
    setCards((cs) => [...cs, { id: crypto.randomUUID(), front: f.slice(0, 200), back: b.slice(0, 400), box: 1, due: Date.now() }]);
    setFront(""); setBack(""); setEvent("note_saved");
  };
  const answer = (known: boolean) => {
    if (!current) return;
    const box = (known ? Math.min(3, current.box + 1) : 1) as 1 | 2 | 3;
    const t = Date.now();
    setCards((cs) => cs.map((c) => (c.id === current.id ? { ...c, box, due: known ? t + GAP[box] : t } : c)));
    setFlipped(false); setCount((n) => n + 1);
    setEvent(known ? "quiz_correct" : "quiz_wrong");
  };
  const remove = (id: string) => { if (confirm("ลบการ์ดใบนี้?")) setCards((cs) => cs.filter((c) => c.id !== id)); };
  const field = "w-full rounded-2xl border border-brand-100 bg-white p-3 text-sm";

  if (!ready) return <div className="h-40" aria-hidden />;
  const bubble: MascotEvent = cards.length && !current ? "flashcard_done" : event;

  return (
    <div className="grid gap-5">
      <MascotBubble event={bubble} seed={count} />
      {err && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      <Card className="grid gap-4">
        {current ? (
          <>
            <p className="text-sm text-ink-soft">เหลือต้องทบทวน {queue.length} ใบ · กล่อง {current.box}/3</p>
            <button onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}
              className="min-h-48 rounded-3xl bg-gradient-to-br from-brand-50 to-sun-100 p-6 text-xl font-semibold shadow-soft ring-1 ring-brand-100 transition active:scale-[0.99]">
              <span className="block text-xs font-medium text-ink-soft">{flipped ? "คำตอบ" : "โจทย์ (แตะเพื่อพลิก)"}</span>
              {flipped ? current.back : current.front}
            </button>
            {flipped && (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => answer(false)} className="min-h-12">ยังไม่แน่ใจ</Button>
                <Button onClick={() => answer(true)} className="min-h-12">จำได้แล้ว!</Button>
              </div>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-ink-soft">{cards.length ? "วันนี้ทบทวนครบแล้ว 🎉 พักได้เลย" : "ยังไม่มีการ์ด เพิ่มใบแรกด้านล่างได้เลย"}</p>
        )}
      </Card>

      <Card className="grid gap-3">
        <h2 className="font-semibold">เพิ่มการ์ดใหม่</h2>
        <label className="grid gap-1 text-sm">ด้านหน้า (โจทย์/คำศัพท์)
          <textarea className={field} rows={2} maxLength={200} value={front} onChange={(e) => setFront(e.target.value)} /></label>
        <label className="grid gap-1 text-sm">ด้านหลัง (คำตอบ)
          <textarea className={field} rows={2} maxLength={400} value={back} onChange={(e) => setBack(e.target.value)} /></label>
        <Button onClick={add} disabled={!front.trim() || !back.trim()} className="min-h-12">บันทึกการ์ด</Button>
      </Card>

      {cards.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">การ์ดทั้งหมด ({cards.length})</h2>
          <ul className="divide-y divide-brand-100 text-sm">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{c.front}</span>
                <button onClick={() => remove(c.id)} aria-label={`ลบการ์ด ${c.front}`} className="min-h-11 min-w-11 rounded-xl text-red-700 hover:bg-red-50">ลบ</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
