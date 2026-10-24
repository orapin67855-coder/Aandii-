export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-3 w-full overflow-hidden rounded-full bg-brand-50">
      <div className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-600 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
