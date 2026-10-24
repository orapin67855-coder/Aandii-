"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/mascot/Mascot";
import type { DailyPlan, ReadinessLevel } from "@/lib/readiness/score";

function Scale({ label, hint, value, onChange }: { label: string; hint: [string, string]; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{label}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(n)}
            className={clsx("min-h-[48px] flex-1 rounded-2xl text-lg font-semibold ring-1 transition",
              value === n ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-ink ring-brand-100 hover:bg-brand-50")}>{n}</button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-soft"><span>{hint[0]}</span><span>{hint[1]}</span></div>
    </fieldset>
  );
}

export function ReadinessForm() {
  const router = useRouter();
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [result, setResult] = useState<{ score: number; level: ReadinessLevel; message: string; daily: DailyPlan } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError(null);
    const res = await fetch("/api/readiness", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sleepHours, sleepQuality, energy, mood, stress }),
    });
    const data = await res.json() as { error?: string; plan?: { score: number; level: ReadinessLevel; message: string; daily: DailyPlan } };
    setPending(false);
    if (!res.ok || !data.plan) {
      setError(data.error ?? "บันทึกแผนไม่ได้");
      return;
    }
    setResult(data.plan);
    router.refresh();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="space-y-5">
        <label className="block space-y-2">
          <span className="font-semibold">เมื่อคืนนอนกี่ชั่วโมง</span>
          <input type="number" inputMode="decimal" min={0} max={14} step={0.5} value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="min-h-[48px] w-full rounded-2xl border-0 px-4 text-lg ring-1 ring-brand-100" />
        </label>
        <Scale label="คุณภาพการนอน" hint={["แย่", "ดีมาก"]} value={sleepQuality} onChange={setSleepQuality} />
        <Scale label="พลังงานตอนนี้" hint={["เหนื่อย", "สดชื่น"]} value={energy} onChange={setEnergy} />
        <Scale label="อารมณ์ตอนนี้" hint={["ไม่ค่อยดี", "ดีมาก"]} value={mood} onChange={setMood} />
        <Scale label="ความเครียด" hint={["น้อย", "มาก"]} value={stress} onChange={setStress} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button className="min-h-12 w-full" disabled={pending} onClick={() => void submit()}>ดูคำแนะนำวันนี้</Button>
        <p className="text-xs text-ink-soft">ผลนี้เป็นแนวทางช่วยวางแผนการอ่านเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์</p>
      </Card>

      <Card className="grid place-items-center gap-3 text-center">
        {!result ? (
          <><Mascot state="ready" size={160} /><p className="text-ink-soft">กรอกแบบสั้นๆ แล้วน้องไข่จะช่วยแนะนำรูปแบบการอ่านวันนี้</p></>
        ) : (
          <>
            <Mascot state={result.level === "low" ? "sleepy" : "yay"} size={150} />
            <p className="text-4xl font-bold text-brand-700">{result.score}<span className="text-lg text-ink-soft">/100</span></p>
            <p className="text-ink-soft">{result.message}</p>
            <p className="text-sm text-ink-soft">{result.daily.note}</p>
            <ul className="grid w-full grid-cols-3 gap-2 text-sm">
              <li className="rounded-2xl bg-brand-50 p-3"><b className="block text-lg">{result.daily.totalStudyMinutes}</b>นาทีรวม</li>
              <li className="rounded-2xl bg-mint-100 p-3"><b className="block text-lg">{result.daily.focusMinutes}</b>นาที/รอบ</li>
              <li className="rounded-2xl bg-sun-100 p-3"><b className="block text-lg">{result.daily.blocks}</b>รอบ</li>
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
