"use client";

import { useEffect, useState } from "react";

const SPANS = [
  { id: "week", label: "สัปดาห์" },
  { id: "month", label: "เดือน" },
  { id: "year", label: "ปี" },
] as const;

type Span = (typeof SPANS)[number]["id"];

export function ProgressChart() {
  const [span, setSpan] = useState<Span>("week");
  const [labels, setLabels] = useState<string[]>([]);
  const [minutes, setMinutes] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    void fetch(`/api/progress?span=${span}`, { cache: "no-store" }).then(async (res) => {
      const data = await res.json() as { labels?: string[]; minutes?: number[]; error?: string };
      if (stop) return;
      if (!res.ok) {
        setError(data.error ?? "โหลดกราฟไม่ได้");
        return;
      }
      setError("");
      setLabels(data.labels ?? []);
      setMinutes(data.minutes ?? []);
    }).catch(() => { if (!stop) setError("โหลดกราฟไม่ได้"); });
    return () => { stop = true; };
  }, [span]);

  const max = Math.max(60, ...minutes);
  const total = minutes.reduce((sum, value) => sum + value, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">เวลาอ่านที่บันทึกแล้ว</h2>
        <div className="flex gap-2" role="tablist" aria-label="ช่วงเวลา">
          {SPANS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={span === item.id} onClick={() => setSpan(item.id)} className={`min-h-11 rounded-2xl px-4 text-sm font-semibold ${span === item.id ? "bg-sun-400 text-ink" : "bg-brand-50 text-brand-700"}`}>{item.label}</button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-sm text-ink-soft">รวม {total} นาที จากรอบที่กดจบแล้ว</p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex h-44 items-end gap-1 overflow-x-auto" role="img" aria-label={`กราฟ${SPANS.find((item) => item.id === span)?.label}: ${labels.map((label, index) => `${label} ${minutes[index] ?? 0} นาที`).join(", ")}`}>
        {labels.map((label, index) => (
          <div key={`${span}-${label}`} className="flex min-w-6 flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end">
              <div className="w-full rounded-t-xl bg-gradient-to-t from-brand-600 to-brand-300" style={{ height: `${((minutes[index] ?? 0) / max) * 100}%` }} />
            </div>
            <span className="text-[10px] text-ink-soft">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
