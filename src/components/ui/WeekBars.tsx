const DAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
export function WeekBars({ minutes }: { minutes: number[] }) {
  const max = Math.max(60, ...minutes);
  return (
    <div className="flex h-40 items-end justify-between gap-2" role="img" aria-label={`เวลาอ่านรายวัน: ${minutes.map((m, i) => `${DAYS[i]} ${m} นาที`).join(", ")}`}>
      {minutes.map((m, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end">
            <div className="w-full rounded-t-xl bg-gradient-to-t from-brand-600 to-brand-300" style={{ height: `${(m / max) * 100}%` }} />
          </div>
          <span className="text-xs text-ink-soft">{DAYS[i]}</span>
        </div>
      ))}
    </div>
  );
}
