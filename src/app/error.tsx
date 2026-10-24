"use client";

import { Mascot } from "@/components/mascot/Mascot";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-content-center justify-items-center gap-3 bg-cream p-6 text-center">
      <Mascot state="curious" size={140} />
      <h1 className="text-xl font-bold text-brand-700">อุ๊ปส์ มีบางอย่างติดขัด</h1>
      <p className="text-ink-soft">ลองใหม่อีกครั้งได้เลยนะ</p>
      {error.digest && <p className="text-xs text-ink-soft">รหัสอ้างอิง: {error.digest}</p>}
      <button type="button" onClick={reset} className="min-h-12 rounded-2xl bg-sun-400 px-6 font-semibold text-ink">ลองใหม่</button>
    </main>
  );
}
